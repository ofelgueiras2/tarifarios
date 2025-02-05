async function carregarTarifarios() {
    const sheetURL = "https://docs.google.com/spreadsheets/d/15jAgyfFzlSXTxqMNG-7TD-f-ZAWa5tZQwUQ8E-I8BsE/gviz/tq?tqx=out:json&range=B5:D25";
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
    
    const tarifarios = json.table.rows.map(row => {
        const nome = row.c[0]?.v || "Desconhecido";
        const potencia = parseFloat(row.c[1]?.v) || 0;
        const simples = parseFloat(row.c[2]?.v) || 0;
        const custo = (potencia * 30 + simples * consumo).toFixed(2);
        return { nome, potencia, simples, custo: parseFloat(custo) };
    });
    
    preencherLista(tarifarios);
    calcularPreco(tarifarios, consumo);
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
                                    <th colspan="3">Potência contratada ${potenciaSelecionada}</th>
                                    <th>Consumo (kWh)</th>
                                </tr>
                                <tr>
                                    <td colspan="3"></td>
                                    <td>${consumo || 0}</td>
                                </tr>
                                <tr>
                                    <th>Tarifário</th>
                                    <th>Potência (€/dia)</th>
                                    <th>Simples (€/kWh)</th>
                                    <th>Custo Estimado (€)</th>
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
                                <td style='${isMinCusto} background-color:${corCusto}; color:black;'>${tarifa.custo.toFixed(2)}€</td>
                             </tr>`;
    });
    
    tabelaResultados += "</table>";
    document.getElementById("resultado").innerHTML = tabelaResultados;
}

document.getElementById("consumo").addEventListener("input", carregarTarifarios);
document.getElementById("potenciac").addEventListener("change", carregarTarifarios);
window.onload = carregarTarifarios;
