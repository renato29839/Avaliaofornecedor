let database = JSON.parse(localStorage.getItem('srm_final_v4') || '[]');

// NAVEGAÇÃO ENTRE TELAS
window.showScreen = (id) => {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
    document.getElementById(`screen-${id}`).classList.remove('hidden');
    document.getElementById(`btn-${id}`).classList.add('active');
    
    if(id === 'eval') updatePendingSelect();
    if(id === 'history') loadHistory();
};

// COMPRADOR: CRIAR ORDEM
window.createOrder = () => {
    const supplier = document.getElementById('adminSupplier').value;
    const unit = document.getElementById('adminUnit').value;

    if(!supplier) return alert("Por favor, preencha o nome do Fornecedor.");

    const orderId = 'NPC-' + Math.floor(1000 + Math.random() * 9000);
    database.push({
        id: orderId,
        supplier,
        unit,
        status: 'Pendente',
        score: null,
        invoice: null,
        report: '',
        alertLevel: '',
        timestamp: Date.now()
    });

    localStorage.setItem('srm_final_v4', JSON.stringify(database));
    document.getElementById('linkOutput').classList.remove('hidden');
    document.getElementById('generatedID').innerText = orderId;
    document.getElementById('adminSupplier').value = '';
};

// RECEBEDOR: ATUALIZAR LISTA
window.updatePendingSelect = () => {
    const unit = document.getElementById('filterUnit').value;
    const select = document.getElementById('pendingOrders');
    const pendentes = database.filter(item => item.unit === unit && item.status === 'Pendente');
    
    select.innerHTML = '<option value="">-- Selecione uma Carga --</option>' + 
        pendentes.map(p => `<option value="${p.id}">${p.supplier} (${p.id})</option>`).join('');
    
    document.getElementById('evalFields').classList.add('hidden');
};

window.loadOrderDetails = () => {
    const val = document.getElementById('pendingOrders').value;
    document.getElementById('evalFields').classList.toggle('hidden', !val);
};

// RECEBEDOR: SALVAR AVALIAÇÃO
window.submitEvaluation = () => {
    const id = document.getElementById('pendingOrders').value;
    const invoice = document.getElementById('invoiceNumber').value;
    const report = document.getElementById('obsOpen').value;
    const scoreEl = document.querySelector('input[name="score"]:checked');

    if(!invoice || !scoreEl) return alert("Erro: Informe o Nº da Nota e selecione uma nota de 1 a 5.");

    const score = parseInt(scoreEl.value);
    const index = database.findIndex(o => o.id === id);
    
    let level = score === 5 ? "excelente" : (score >= 3 ? "regular" : "critico");

    database[index] = { 
        ...database[index], 
        status: 'Avaliado', 
        score, invoice, report, alertLevel: level,
        evalDate: new Date().toLocaleDateString('pt-BR') 
    };

    localStorage.setItem('srm_final_v4', JSON.stringify(database));
    alert("Dados registrados com sucesso!");
    showScreen('history');
};

// DASHBOARD: CARREGAR DADOS
function loadHistory() {
    const body = document.getElementById('historyBody');
    const data = database.filter(d => d.status === 'Avaliado').sort((a,b) => b.timestamp - a.timestamp);

    body.innerHTML = data.map(d => `
        <tr>
            <td><strong>${d.unit}</strong></td>
            <td>${d.supplier}</td>
            <td>#${d.invoice}</td>
            <td style="font-weight: 800; font-size: 1.1rem">${d.score}</td>
            <td><span class="status-badge bg-${d.alertLevel}">${d.alertLevel}</span></td>
            <td><button onclick="deleteRow('${d.id}')" style="background:none; border:none; cursor:pointer">🗑️</button></td>
        </tr>
    `).join('');
}

window.deleteRow = (id) => {
    if(confirm("Deseja apagar este registro?")) {
        database = database.filter(d => d.id !== id);
        localStorage.setItem('srm_final_v4', JSON.stringify(database));
        loadHistory();
    }
}

window.onload = () => { loadHistory(); };