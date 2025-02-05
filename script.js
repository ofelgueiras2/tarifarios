async function carregarTarifarios() {
    const sheetURL = "https://docs.google.com/spreadsheets/d/15jAgyfFzlSXTxqMNG-7TD-f-ZAWa5tZQwUQ8E-I8BsE/gviz/tq?tqx=out:json&range=B2:V25";
    try {
        const resposta = await fetch(sheetURL);
        if (!resposta.ok) {
            throw new Error(`Erro HTTP: ${resposta.status}`);
        }
        
        const texto = await resposta.text();
        const json = JSON.parse(texto.substr(47).slice(0, -2));
        
        if (!json.table || !json.table.rows || json.table.rows.length === 0) {
            throw new Error("Nenhum tarifário encontrado na folha de cálculo.");
        }
        
        atualizarResultados(json);
    } catch (erro) {
        document.getElementById("listaTarifarios").innerHTML = `❌ ${erro.message}`;
    }
}

function atualizarResultados(json) {
    let consumo = parseFloat(document.getElementById("consumo").value);
    let potenciaSelecionada = document.getElementById("potenciac").value;
    if (isNaN(consumo)) consumo = 0;
    if (!potenciaSelecionada) potenciaSelecionada = "6,9 kVA";
    
    // Identificar a coluna correspondente à potência selecionada
    const potencias = ["1,15 kVA", "2,3 kVA", "3,45 kVA", "4,6 kVA", "5,75 kVA", "6,9 kVA", "10,35 kVA", "13,8 kVA", "17,25 kVA", "20,7 kVA"];
    const colIndex = potencias.indexOf(potenciaSelecionada);
    if (colIndex === -1) {
        throw new Error("Potência selecionada inválida.");
    }
    
    // Determinar os índices das colunas de potência e simples
    const colPotencia = 1 + colIndex * 2; // C, E, G...
    const colSimples = colPotencia + 1;   // D, F, H...
    
    let tarifarios = json.table.rows.slice(0, 23).map(row => {
        const nome = row.c[0]?.v || "Desconhecido";
        const potencia = parseFloat(row.c[colPotencia]?.v) || 0;
        const simples = parseFloat(row.c[colSimples]?.v) || 0;
        const custo = (potencia * 30 + simples * consumo).toFixed(2);
        return { nome, potencia, simples, custo: parseFloat(custo) };
    });
    
    // Ordenação conforme a opção selecionada
    if (ordenarPor === "preco") {
        tarifarios.sort((a, b) => a.custo - b.custo);
    } else if (ordenarPor === "tarifario") {
        tarifarios.sort((a, b) => a.nome.localeCompare(b.nome));
    }
    
    preencherLista(tarifarios);
    calcularPreco(tarifarios, consumo, potenciaSelecionada);
}

function preencherLista(tarifarios) {
    const lista = document.getElementById("listaTarifarios");
    lista.innerHTML = "";
    
    tarifarios.forEach(tarifa => {
        const item = document.createElement("div");
        item.innerHTML = `<input type='checkbox' value='${tarifa.nome}' checked data-custo='${tarifa.custo}'/> ${tarifa.nome} (Custo Estimado: ${tarifa.custo.toFixed(2)}€)`;
        lista.appendChild(item);
    });
}

function calcularPreco(tarifarios, consumo, potenciaSelecionada) {
    const minPotencia = Math.min(...tarifarios.map(t => t.potencia));
    const maxPotencia = Math.max(...tarifarios.map(t => t.potencia));
    const minSimples = Math.min(...tarifarios.map(t => t.simples));
    const maxSimples = Math.max(...tarifarios.map(t => t.simples));
    const minCusto = Math.min(...tarifarios.map(t => t.custo));
    const maxCusto = Math.max(...tarifarios.map(t => t.custo));
    
    function calcularCor(valor, min, max) {
        const corMin = [90, 138, 198]; // #5A8AC6
        const corMed = [252, 252, 255]; // #FCFCFF
        const corMax = [248, 105, 107]; // #F8696B
        let corFinal;
        if (valor <= (min + max) / 2) {
            const percent = (valor - min) / ((min + max) / 2 - min || 1);
            corFinal = corMin.map((c, i) => Math.round(c + percent * (corMed[i] - c)));
        } else {
            const percent = (valor - (min + max) / 2) / (max - (min + max) / 2 || 1);
            corFinal = corMed.map((c, i) => Math.round(c + percent * (corMax[i] - c)));
        }
        return `rgb(${corFinal[0]}, ${corFinal[1]}, ${corFinal[2]})`;
    }
    
    let tabelaResultados = `<table>
                                <tr>
                                    <th colspan="3" rowspan="2" style="background-color:#375623; color:white; text-align:center; vertical-align:middle;">Potência contratada ${potenciaSelecionada}</th>
                                    <th style="background-color:#375623; color:white;">Consumo (kWh)</th>
                                </tr>
                                <tr>
                                    <td style="background-color:#FFC000; font-weight:bold; color:black; text-align:center;">${consumo || 0}</td>
                                </tr>
                                <tr>
                                    <td style="background-color:#00B050; font-weight:bold; color:white;">Tarifário</td>
                                    <td style="background-color:#00B050; font-weight:bold; color:white;">Potência (€/dia)</td>
                                    <td style="background-color:#00B050; font-weight:bold; color:white;">Simples (€/kWh)</td>
                                    <td style="background-color:#00B050; font-weight:bold; color:white;">Preço (€)</td>
                                </tr>`;
    
    tarifarios.forEach(tarifa => {
        const corPotencia = calcularCor(tarifa.potencia, minPotencia, maxPotencia);
        const corSimples = calcularCor(tarifa.simples, minSimples, maxSimples);
        const corCusto = calcularCor(tarifa.custo, minCusto, maxCusto);

        const isMinPotencia = tarifa.potencia === minPotencia ? "font-weight:bold;" : "";
        const isMinSimples = tarifa.simples === minSimples ? "font-weight:bold;" : "";
        const isMinCusto = tarifa.custo === minCusto ? "font-weight:bold;" : "";
        
        tabelaResultados += `<tr>
                                <td>${tarifa.nome}</td>
                                <td style='${isMinPotencia} background-color:${corPotencia}; color:black;'>${tarifa.potencia.toFixed(4)}</td>
                                <td style='${isMinSimples} background-color:${corSimples}; color:black;'>${tarifa.simples.toFixed(4)}</td>
                                <td style='${isMinCusto} background-color:${corCusto}; color:black;'>${tarifa.custo.toFixed(2)}</td>
                             </tr>`;
    });
    
    tabelaResultados += "</table>";
    document.getElementById("resultado").innerHTML = tabelaResultados;
}

document.getElementById("consumo").addEventListener("input", carregarTarifarios);
document.getElementById("potenciac").addEventListener("change", carregarTarifarios);
window.onload = carregarTarifarios;

window.onload = carregarTarifarios;
