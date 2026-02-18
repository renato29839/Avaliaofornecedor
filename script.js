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
    document.getElementById('nf-numero').value = "";
    document.getElementById('nf-item').value = "";
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
    
    if(!id) return alert("Selecione um item!");
    if(!nomeAval) return alert("Por favor, digite seu nome para rastreabilidade.");

    const n1 = parseInt(document.getElementById('nota-qualidade').value);
    const n2 = parseInt(document.getElementById('nota-entrega').value);
    const n3 = parseInt(document.getElementById('nota-estado').value);
    const media = ((n1+n2+n3)/3).toFixed(1);

    const f = document.getElementById('foto-avaria').files[0];
    const base64 = f ? await new Promise(r => { const reader = new FileReader(); reader.readAsDataURL(f); reader.onload = () => r(reader.result); }) : null;

    const feedback = {
        fornecedor: document.getElementById('display-forn').innerText,
        nf: document.getElementById('display-nf').innerText,
        unidade: document.getElementById('display-unidade').innerText,
        avaliador: nomeAval, // CAMPO SALVO NO FIREBASE
        media: parseFloat(media),
        comentario: document.getElementById('comentario').value,
        foto: base64,
        data: new Date().toLocaleString('pt-BR')
    };

    await push(ref(db, 'feedbacks'), feedback);
    await remove(ref(db, `pendentes/${id}`));
    document.getElementById('form-avaliacao').reset();
    window.carregarDadosItem();
    alert("Avaliação Enviada!");
};

window.atualizarDashboard = () => {
    const filtro = document.getElementById('filtro-unidade').value;
    const dados = filtro === "TODAS" ? feedbacksCache : feedbacksCache.filter(f => f.unidade === filtro);

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

window.verDetalhes = (id) => {
    const f = feedbacksCache.find(i => i.id === id);
    document.getElementById('conteudo-detalhe').innerHTML = `
        <p><strong>Unidade:</strong> ${f.unidade}</p>
        <p><strong>Avaliador:</strong> ${f.avaliador || 'Não informado'}</p>
        <p><strong>Data:</strong> ${f.data || '---'}</p>
        <p><strong>Obs:</strong> ${f.comentario || 'Sem observações'}</p>
        ${f.foto ? `<img src="${f.foto}" style="width:100%; margin-top:10px; border-radius:8px;">` : ''}
    `;
    document.getElementById('modal-detalhes').classList.remove('hidden');
};

window.fecharModalDetalhe = () => document.getElementById('modal-detalhes').classList.add('hidden');

function renderizarGrafico(dados) {
    const ctx = document.getElementById('meuGrafico').getContext('2d');
    if(meuGrafico) meuGrafico.destroy();
    const resumo = {};
    dados.forEach(f => {
        resumo[f.fornecedor] = resumo[f.fornecedor] || { s: 0, q: 0 };
        resumo[f.fornecedor].s += f.media; resumo[f.fornecedor].q++;
    });
    meuGrafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(resumo),
            datasets: [{ label: 'Média', data: Object.values(resumo).map(r => (r.s/r.q).toFixed(1)), backgroundColor: '#20b2aa' }]
        },
        options: { scales: { y: { beginAtZero: true, max: 5 } } }
    });
}
