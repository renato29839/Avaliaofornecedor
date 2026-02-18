import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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
let feedbacksConcluidos = [];

// --- NAVEGAÇÃO E ACESSO REMOTO ---

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
    
    // Busca a senha no banco de dados em vez de ter no código
    const senhaRef = ref(db, 'config/senha_master');
    get(senhaRef).then((snapshot) => {
        if (snapshot.exists()) {
            const senhaReal = snapshot.val();
            if (senhaDigitada === String(senhaReal)) {
                window.fecharModal();
                window.irParaTela(targetView);
            } else {
                alert("Acesso Negado! Senha incorreta.");
            }
        } else {
            // Se você ainda não criou a senha no Firebase, ele avisa:
            alert("Erro: Senha não configurada no Banco de Dados.");
        }
    }).catch((error) => {
        console.error(error);
        alert("Erro ao conectar ao servidor.");
    });
};

window.irParaTela = (id) => {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-' + id).classList.remove('hidden');
    document.querySelectorAll('.btn-nav').forEach(b => b.classList.remove('active'));
    
    if(id === 'colaborador') document.getElementById('btn-colab').classList.add('active');
    if(id === 'compras') document.getElementById('btn-compras').classList.add('active');
    if(id === 'dashboard') document.getElementById('btn-dash').classList.add('active');
};

// --- COMPRAS ---

window.cadastrarFornecedor = () => {
    let nome = document.getElementById('cad-forn-nome').value.trim();
    if(!nome) return;
    push(ref(db, 'fornecedores'), { nome });
    document.getElementById('cad-forn-nome').value = "";
    alert("Fornecedor cadastrado!");
};

window.gerarProtocolo = () => {
    let nf = document.getElementById('nf-numero').value;
    let prod = document.getElementById('nf-item').value;
    let forn = document.getElementById('nf-fornecedor-select').value;
    if(!nf || !prod) return alert("Preencha os campos!");

    push(ref(db, 'pendentes'), { fornecedor: forn, nf, produto: prod });
    document.getElementById('nf-numero').value = "";
    document.getElementById('nf-item').value = "";
    alert("Protocolo Enviado!");
};

// --- SINCRONIZAÇÃO FIREBASE ---

onValue(ref(db, 'fornecedores'), (snap) => {
    const data = snap.val();
    const sel = document.getElementById('nf-fornecedor-select');
    if(data) sel.innerHTML = Object.values(data).map(f => `<option value="${f.nome}">${f.nome}</option>`).join('');
});

onValue(ref(db, 'pendentes'), (snap) => {
    const data = snap.val();
    pendentesLocais = data || {};
    const sel = document.getElementById('select-item-pendente');
    let html = '<option value="">-- Selecione o Item --</option>';
    if(data) Object.keys(data).forEach(k => html += `<option value="${k}">NF: ${data[k].nf} - ${data[k].produto}</option>`);
    sel.innerHTML = html;
});

onValue(ref(db, 'feedbacks'), (snap) => {
    const data = snap.val();
    feedbacksConcluidos = data ? Object.entries(data).map(([id, v]) => ({ id, ...v })) : [];
    atualizarDashboard();
});

// --- COLABORADOR ---

window.carregarDadosItem = () => {
    let id = document.getElementById('select-item-pendente').value;
    let item = pendentesLocais[id];
    document.getElementById('display-item').innerText = item ? item.produto : "---";
    document.getElementById('display-forn').innerText = item ? item.fornecedor : "---";
    document.getElementById('display-nf').innerText = item ? item.nf : "---";
};

window.enviarAvaliacao = async () => {
    const id = document.getElementById('select-item-pendente').value;
    if(!id) return alert("Selecione o item!");

    const n1 = parseInt(document.getElementById('nota-qualidade').value);
    const n2 = parseInt(document.getElementById('nota-entrega').value);
    const n3 = parseInt(document.getElementById('nota-estado').value);
    const media = ((n1+n2+n3)/3).toFixed(1);

    const fotoInput = document.getElementById('foto-avaria');
    let fotoBase64 = null;
    if (fotoInput.files && fotoInput.files[0]) {
        fotoBase64 = await toBase64(fotoInput.files[0]);
    }

    const novoFeedback = {
        fornecedor: document.getElementById('display-forn').innerText,
        nf: document.getElementById('display-nf').innerText,
        produto: document.getElementById('display-item').innerText,
        media: parseFloat(media),
        comentario: document.getElementById('comentario').value || "Sem obs.",
        foto: fotoBase64
    };

    await push(ref(db, 'feedbacks'), novoFeedback);
    await remove(ref(db, `pendentes/${id}`));

    document.getElementById('form-avaliacao').reset();
    window.carregarDadosItem();
    alert("Recebimento Concluído!");
};

const toBase64 = file => new Promise((res, rej) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => res(reader.result);
    reader.onerror = e => rej(e);
});

// --- DASHBOARD ---

function atualizarDashboard() {
    const total = feedbacksConcluidos.length;
    const mediaGeral = total > 0 ? (feedbacksConcluidos.reduce((a, b) => a + b.media, 0) / total).toFixed(1) : 0;
    
    document.getElementById('kpi-total').innerText = total;
    document.getElementById('kpi-media').innerText = mediaGeral;

    const tbody = document.getElementById('ranking-body');
    tbody.innerHTML = [...feedbacksConcluidos].reverse().map(f => `
        <tr>
            <td><b>${f.fornecedor}</b><br><small>NF: ${f.nf}</small></td>
            <td><span class="status-badge ${f.media < 3 ? 'status-low' : 'status-high'}">${f.media}</span></td>
            <td><button class="btn-ver" onclick="verDetalhes('${f.id}')">Detalhes</button></td>
        </tr>
    `).join('');

    renderizarGrafico();
}

window.verDetalhes = (id) => {
    const f = feedbacksConcluidos.find(item => item.id === id);
    const conteudo = document.getElementById('conteudo-detalhe');
    conteudo.innerHTML = `
        <p><strong>Item:</strong> ${f.produto}</p>
        <p><strong>Observações:</strong> "${f.comentario}"</p>
        ${f.foto ? `<div class="foto-container"><img src="${f.foto}"></div>` : '<p>Sem foto.</p>'}
    `;
    document.getElementById('modal-detalhes').classList.remove('hidden');
};

window.fecharModalDetalhe = () => document.getElementById('modal-detalhes').classList.add('hidden');

function renderizarGrafico() {
    const ctx = document.getElementById('meuGrafico').getContext('2d');
    if(meuGrafico) meuGrafico.destroy();
    const resumo = {};
    feedbacksConcluidos.forEach(f => {
        if(!resumo[f.fornecedor]) resumo[f.fornecedor] = { s: 0, q: 0 };
        resumo[f.fornecedor].s += f.media; resumo[f.fornecedor].q++;
    });
    meuGrafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(resumo),
            datasets: [{ label: 'Média de Notas', data: Object.values(resumo).map(r => (r.s/r.q).toFixed(1)), backgroundColor: '#20b2aa' }]
        },
        options: { scales: { y: { beginAtZero: true, max: 5 } } }
    });
}
