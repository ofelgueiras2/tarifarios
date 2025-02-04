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
        
        const tarifarios = json.table.rows.map(row => {
            const nome = row.c[0]?.v || "Desconhecido";
            const potencia = parseFloat(row.c[1]?.v) || 0;
            const simples = parseFloat(row.c[2]?.v) || 0;
            const custo = (potencia * 30 + simples * 250).toFixed(2);
            return { nome, potencia, simples, custo: parseFloat(custo) };
        });
        
        preencherLista(tarifarios);
        calcularPreco(tarifarios);
    } catch (erro) {
        document.getElementById("listaTarifarios").innerHTML = `❌ ${erro.message}`;
    }
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

window.onload = carregarTarifarios;
