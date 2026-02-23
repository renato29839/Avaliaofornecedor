import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDctLVPi9e5lgANwZPfAqnb4Nx7FBBkIf0",
    authDomain: "srmnpc-d0664.firebaseapp.com",
    databaseURL: "https://srmnpc-d0664-default-rtdb.firebaseio.com",
    projectId: "srmnpc-d0664",
    storageBucket: "srmnpc-d0664.firebasestorage.app",
    messagingSenderId: "678617853925",
    appId: "1:678617853925:web:b5611f980265815122490c"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let targetView = "";
let meuGrafico = null;
let pendentesLocais = {};
let feedbacksCache = [];

// ACESSO
window.abrirAutenticacao = (view) => {
    targetView = view;
    document.getElementById('modal-senha').classList.remove('hidden');
};

window.fecharModal = () => {
    document.getElementById('modal-senha').classList.add('hidden');
    document.getElementById('input-senha').value = "";
};

window.confirmarAcesso = () => {
    const senhaDigitada = document.getElementById('input-senha').value;
    get(ref(db, 'config/senha_master')).then((snap) => {
        if (senhaDigitada === String(snap.val())) {
            window.fecharModal();
            window.irParaTela(targetView);
        } else {
            alert("Senha Incorreta!");
        }
    });
};

window.irParaTela = (id) => {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-' + id).classList.remove('hidden');
    document.querySelectorAll('.btn-nav').forEach(b => b.classList.remove('active'));
    const btnMap = { 'colaborador': 'btn-colab', 'compras': 'btn-compras', 'dashboard': 'btn-dash' };
    document.getElementById(btnMap[id]).classList.add('active');
};

// GESTÃO
window.cadastrarFornecedor = () => {
    const nome = document.getElementById('cad-forn-nome').value.trim();
    if(nome) push(ref(db, 'fornecedores'), { nome });
    document.getElementById('cad-forn-nome').value = "";
};

window.gerarProtocolo = () => {
    const nf = document.getElementById('nf-numero').value;
    const prod = document.getElementById('nf-item').value;
    const forn = document.getElementById('nf-fornecedor-select').value;
    const unid = document.getElementById('nf-unidade').value;
    if(!nf || !prod) return alert("Preencha os campos!");
    push(ref(db, 'pendentes'), { fornecedor: forn, nf: nf, produto: prod, unidade: unid });
    alert("Liberado com sucesso!");
};

onValue(ref(db, 'fornecedores'), (s) => {
    const data = s.val();
    const sel = document.getElementById('nf-fornecedor-select');
    if(data) sel.innerHTML = Object.values(data).map(f => `<option value="${f.nome}">${f.nome}</option>`).join('');
});

onValue(ref(db, 'pendentes'), (s) => {
    const data = s.val();
    pendentesLocais = data || {};
    const sel = document.getElementById('select-item-pendente');
    let html = '<option value="">-- Selecione o Item --</option>';
    if(data) Object.keys(data).forEach(k => html += `<option value="${k}">${data[k].unidade} | NF: ${data[k].nf}</option>`);
    sel.innerHTML = html;
});

onValue(ref(db, 'feedbacks'), (s) => {
    const data = s.val();
    feedbacksCache = data ? Object.entries(data).map(([id, v]) => ({ id, ...v })) : [];
    window.atualizarDashboard();
});

// AVALIAÇÃO
window.carregarDadosItem = () => {
    const id = document.getElementById('select-item-pendente').value;
    const item = pendentesLocais[id];
    document.getElementById('display-item').innerText = item ? item.produto : "---";
    document.getElementById('display-forn').innerText = item ? item.fornecedor : "---";
    document.getElementById('display-nf').innerText = item ? item.nf : "---";
    document.getElementById('display-unidade').innerText = item ? item.unidade : "---";
};

window.enviarAvaliacao = async () => {
    const id = document.getElementById('select-item-pendente').value;
    const nomeAval = document.getElementById('nome-avaliador').value.trim();
    if(!id || !nomeAval) return alert("Selecione o item e digite seu nome!");

    const n1 = parseInt(document.getElementById('nota-qualidade').value);
    const n2 = parseInt(document.getElementById('nota-entrega').value);
    const n3 = parseInt(document.getElementById('nota-estado').value);
    const media = ((n1+n2+n3)/3).toFixed(1);

    const f = document.getElementById('foto-avaria').files[0];
    const base64 = f ? await new Promise(r => { const reader = new FileReader(); reader.readAsDataURL(f); reader.onload = () => r(reader.result); }) : null;

    const feedback = {
        fornecedor: document.getElementById('display-forn').innerText,
        nf: document.getElementById('display-nf').innerText,
        produto: document.getElementById('display-item').innerText,
        unidade: document.getElementById('display-unidade').innerText,
        avaliador: nomeAval,
        media: parseFloat(media),
        comentario: document.getElementById('comentario').value,
        foto: base64,
        data: new Date().toLocaleString('pt-BR'),
        timestamp: Date.now()
    };

    await push(ref(db, 'feedbacks'), feedback);
    await remove(ref(db, `pendentes/${id}`));
    document.getElementById('form-avaliacao').reset();
    window.carregarDadosItem();
    alert("Avaliação Enviada!");
};

// DASHBOARD
window.atualizarDashboard = () => {
    const filtroUnidade = document.getElementById('filtro-unidade').value;
    const dataInicio = document.getElementById('filtro-data-inicio').value;
    const dataFim = document.getElementById('filtro-data-fim').value;

    let dados = feedbacksCache;

    if (filtroUnidade !== "TODAS") dados = dados.filter(f => f.unidade === filtroUnidade);

    if (dataInicio || dataFim) {
        dados = dados.filter(f => {
            const dataReg = f.timestamp ? new Date(f.timestamp) : converterDataPTBR(f.data);
            const inicio = dataInicio ? new Date(dataInicio + "T00:00:00") : null;
            const fim = dataFim ? new Date(dataFim + "T23:59:59") : null;
            if (inicio && dataReg < inicio) return false;
            if (fim && dataReg > fim) return false;
            return true;
        });
    }

    document.getElementById('kpi-total').innerText = dados.length;
    document.getElementById('kpi-media').innerText = dados.length ? (dados.reduce((a, b) => a + b.media, 0) / dados.length).toFixed(1) : 0;

    const tbody = document.getElementById('ranking-body');
    tbody.innerHTML = [...dados].reverse().map(f => `
        <tr>
            <td><b>${f.fornecedor}</b><br><small>${f.unidade}</small></td>
            <td><span class="status-badge ${f.media < 3 ? 'status-low' : 'status-high'}">${f.media}</span></td>
            <td><button class="btn-ver" onclick="verDetalhes('${f.id}')">Ver</button></td>
        </tr>
    `).join('');

    renderizarGrafico(dados);
};

function converterDataPTBR(str) {
    if(!str) return new Date(0);
    const [d, t] = str.split(', ');
    const [dia, mes, ano] = d.split('/');
    return new Date(`${ano}-${mes}-${dia}T${t || '00:00:00'}`);
}

window.verDetalhes = (id) => {
    const f = feedbacksCache.find(i => i.id === id);
    document.getElementById('conteudo-detalhe').innerHTML = `
        <p><strong>📦 Produto:</strong> ${f.produto || 'Não informado'}</p>
        <p><strong>🚚 Fornecedor:</strong> ${f.fornecedor}</p>
        <p><strong>📄 NF:</strong> ${f.nf}</p>
        <p><strong>🏢 Unidade:</strong> ${f.unidade}</p>
        <p><strong>👤 Avaliador:</strong> ${f.avaliador || '---'}</p>
        <p><strong>📅 Data:</strong> ${f.data || '---'}</p>
        <p><strong>💬 Obs:</strong> ${f.comentario || 'Sem observações'}</p>
        ${f.foto ? `<img src="${f.foto}" style="width:100%; margin-top:10px; border-radius:8px;">` : ''}
    `;
    document.getElementById('modal-detalhes').classList.remove('hidden');
};

window.fecharModalDetalhe = () => document.getElementById('modal-detalhes').classList.add('hidden');

function renderizarGrafico(dados) {
    const ctx = document.getElementById('meuGrafico').getContext('2d');
    if(meuGrafico) meuGrafico.destroy();
    const res = {};
    dados.forEach(f => { res[f.fornecedor] = res[f.fornecedor] || {s:0,q:0}; res[f.fornecedor].s += f.media; res[f.fornecedor].q++; });
    meuGrafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(res),
            datasets: [{ label: 'Média', data: Object.values(res).map(r => (r.s/r.q).toFixed(1)), backgroundColor: '#20b2aa' }]
        },
        options: { scales: { y: { beginAtZero: true, max: 5 } } }
    });
}
