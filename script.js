const SENHA_MASTER = "123";
let fornecedores = ["Distribuidora Farma", "Móveis Pro", "Tech Solutions"];
let itensPendentes = [];
let feedbacksConcluidos = [];
let meuGrafico = null;
let targetView = "";

// NAVEGAÇÃO E ACESSO
function abrirAutenticacao(view) {
    targetView = view;
    document.getElementById('modal-senha').classList.remove('hidden');
}

function fecharModal() {
    document.getElementById('modal-senha').classList.add('hidden');
    document.getElementById('input-senha').value = "";
}

function confirmarAcesso() {
    if (document.getElementById('input-senha').value === SENHA_MASTER) {
        fecharModal();
        irParaTela(targetView);
    } else {
        alert("Acesso Negado!");
    }
}

function irParaTela(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-' + id).classList.remove('hidden');
    document.querySelectorAll('.btn-nav').forEach(b => b.classList.remove('active'));
    
    if(id === 'colaborador') document.getElementById('btn-colab').classList.add('active');
    if(id === 'compras') {
        document.getElementById('btn-compras').classList.add('active');
        document.getElementById('nf-fornecedor-select').innerHTML = fornecedores.map(f => `<option value="${f}">${f}</option>`).join('');
    }
    if(id === 'dashboard') {
        document.getElementById('btn-dash').classList.add('active');
        atualizarDashboard();
    }
}

// LÓGICA DE COMPRAS
function cadastrarFornecedor() {
    let nome = document.getElementById('cad-forn-nome').value.trim();
    if(!nome) return;
    fornecedores.push(nome);
    document.getElementById('cad-forn-nome').value = "";
    alert("Fornecedor cadastrado!");
}

function gerarProtocolo() {
    let nf = document.getElementById('nf-numero').value;
    let prod = document.getElementById('nf-item').value;
    if(!nf || !prod) return alert("Preencha NF e Produto!");

    itensPendentes.push({
        id: Date.now(),
        fornecedor: document.getElementById('nf-fornecedor-select').value,
        nf: nf,
        produto: prod
    });

    document.getElementById('nf-numero').value = "";
    document.getElementById('nf-item').value = "";
    alert("Protocolo Gerado!");
    atualizarSelectColaborador();
}

// LÓGICA DO COLABORADOR
function atualizarSelectColaborador() {
    const sel = document.getElementById('select-item-pendente');
    sel.innerHTML = '<option value="">-- Selecione o Item --</option>' + 
        itensPendentes.map(p => `<option value="${p.id}">NF: ${p.nf} - ${p.produto}</option>`).join('');
}

function carregarDadosItem() {
    let id = document.getElementById('select-item-pendente').value;
    let item = itensPendentes.find(i => i.id == id);
    document.getElementById('display-item').innerText = item ? item.produto : "---";
    document.getElementById('display-forn').innerText = item ? item.fornecedor : "---";
    document.getElementById('display-nf').innerText = item ? item.nf : "---";
}

async function enviarAvaliacao() {
    const id = document.getElementById('select-item-pendente').value;
    if(!id) return alert("Selecione o item!");

    const n1 = parseInt(document.getElementById('nota-qualidade').value);
    const n2 = parseInt(document.getElementById('nota-entrega').value);
    const n3 = parseInt(document.getElementById('nota-estado').value);
    const media = ((n1+n2+n3)/3).toFixed(1);

    // Processamento de Imagem
    const fotoInput = document.getElementById('foto-avaria');
    let fotoBase64 = null;
    if (fotoInput.files && fotoInput.files[0]) {
        fotoBase64 = await toBase64(fotoInput.files[0]);
    }

    feedbacksConcluidos.push({
        id: Date.now(),
        fornecedor: document.getElementById('display-forn').innerText,
        nf: document.getElementById('display-nf').innerText,
        produto: document.getElementById('display-item').innerText,
        media: parseFloat(media),
        comentario: document.getElementById('comentario').value || "Nenhuma observação relatada.",
        foto: fotoBase64
    });

    itensPendentes = itensPendentes.filter(i => i.id != id);
    document.getElementById('form-avaliacao').reset();
    atualizarSelectColaborador();
    carregarDadosItem();
    alert("Avaliação Enviada!");
}

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// LÓGICA DASHBOARD
function atualizarDashboard() {
    const total = feedbacksConcluidos.length;
    const mediaGeral = total > 0 ? (feedbacksConcluidos.reduce((a, b) => a + b.media, 0) / total).toFixed(1) : 0;
    
    document.getElementById('kpi-total').innerText = total;
    document.getElementById('kpi-media').innerText = mediaGeral;

    const tbody = document.getElementById('ranking-body');
    tbody.innerHTML = feedbacksConcluidos.map(f => `
        <tr>
            <td><b>${f.fornecedor}</b><br><small>NF: ${f.nf}</small></td>
            <td><span class="status-badge ${f.media < 3 ? 'status-low' : 'status-high'}">${f.media}</span></td>
            <td><button class="btn-ver" onclick="verDetalhes(${f.id})">Detalhes</button></td>
        </tr>
    `).join('');

    renderizarGrafico();
}

function verDetalhes(id) {
    const f = feedbacksConcluidos.find(item => item.id === id);
    const conteudo = document.getElementById('conteudo-detalhe');
    
    conteudo.innerHTML = `
        <p><strong>Item:</strong> ${f.produto}</p>
        <p><strong>Comentário do Recebimento:</strong></p>
        <div style="background:#f9f9f9; padding:10px; border-radius:5px; font-style:italic">"${f.comentario}"</div>
        ${f.foto ? `
            <p><strong>Evidência Fotográfica:</strong></p>
            <div class="foto-container"><img src="${f.foto}"></div>
        ` : '<p style="margin-top:10px; color:gray">Sem foto anexada.</p>'}
    `;
    document.getElementById('modal-detalhes').classList.remove('hidden');
}

function fecharModalDetalhe() {
    document.getElementById('modal-detalhes').classList.add('hidden');
}

function renderizarGrafico() {
    const ctx = document.getElementById('meuGrafico').getContext('2d');
    if(meuGrafico) meuGrafico.destroy();

    const resumo = {};
    feedbacksConcluidos.forEach(f => {
        if(!resumo[f.fornecedor]) resumo[f.fornecedor] = { soma: 0, qtd: 0 };
        resumo[f.fornecedor].soma += f.media;
        resumo[f.fornecedor].qtd++;
    });

    meuGrafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(resumo),
            datasets: [{
                label: 'Média de Desempenho',
                data: Object.values(resumo).map(r => (r.soma / r.qtd).toFixed(1)),
                backgroundColor: '#20b2aa'
            }]
        },
        options: { scales: { y: { beginAtZero: true, max: 5 } } }
    });
}

// Init
atualizarSelectColaborador();
