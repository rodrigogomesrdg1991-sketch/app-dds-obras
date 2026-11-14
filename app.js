// ============================================================================
// 1. CONFIGURAÇÃO DO SUPABASE
// ============================================================================
const SUPABASE_URL = 'https://ddkpujfilbkcingsvrgj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_13uyb9IvQ0C_ng7Z_2bnGw_yhftW4TV';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let participantes = [];

// ============================================================================
// 2. INICIALIZAÇÃO DA PÁGINA
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const agora = new Date();
    agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
    document.getElementById('dataHora').value = agora.toISOString().slice(0, 16);
});

// ============================================================================
// 3. GESTÃO DE COLABORADORES
// ============================================================================
function adicionarParticipante() {
    const inputNome = document.getElementById('novoParticipanteNome');
    const inputFuncao = document.getElementById('novoParticipanteFuncao');
    const selectTipoDoc = document.getElementById('novoParticipanteTipoDoc');
    const inputNumDoc = document.getElementById('novoParticipanteNumDoc');
    const inputAdesao = document.getElementById('novoParticipanteAdesao');

    const nome = inputNome.value.trim();
    const funcao = inputFuncao.value.trim() || 'Operacional';
    const tipoDoc = selectTipoDoc.value;
    const numDoc = inputNumDoc.value.trim();
    const adesao = inputAdesao.value.trim() || '-';

    if (!nome) {
        alert('Digite o nome do colaborador antes de adicionar.');
        inputNome.focus();
        return;
    }

    participantes.push({
        nome: nome,
        funcao: funcao,
        tipoDoc: tipoDoc,
        numDoc: numDoc || 'Não informado',
        adesao: adesao,
        confirmado_em: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    });

    // Limpa os campos
    inputNome.value = '';
    inputFuncao.value = '';
    inputNumDoc.value = '';
    inputAdesao.value = '';
    inputNome.focus();
    renderizarParticipantes();
}

function removerParticipante(index) {
    participantes.splice(index, 1);
    renderizarParticipantes();
}

function renderizarParticipantes() {
    const listaUI = document.getElementById('listaParticipantesUI');
    const contador = document.getElementById('contadorParticipantes');
    
    listaUI.innerHTML = '';

    participantes.forEach((p, index) => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200';
        li.innerHTML = `
            <div class="text-xs space-y-0.5">
                <span class="font-bold text-slate-800">${index + 1}. ${p.nome}</span>
                <span class="text-slate-600 block">Função: ${p.funcao} | ${p.tipoDoc}: ${p.numDoc} | Adesão: ${p.adesao}</span>
                <span class="text-[10px] text-slate-400">Confirmado às ${p.confirmado_em}</span>
            </div>
            <button type="button" onclick="removerParticipante(${index})" class="text-red-500 hover:text-red-700 font-bold px-2 py-1">
                ✕
            </button>
        `;
        listaUI.appendChild(li);
    });

    contador.textContent = `${participantes.length} presentes`;
}

// ============================================================================
// 4. VALIDAÇÃO E COLETA DOS DADOS
// ============================================================================
function obterDadosFormulario() {
    const dataHoraRaw = document.getElementById('dataHora').value;
    const obraSetor = document.getElementById('obraSetor').value.trim();
    const tema = document.getElementById('tema').value.trim();
    const responsavel = document.getElementById('responsavel').value.trim();
    const observacoes = document.getElementById('observacoes').value.trim();

    if (!dataHoraRaw || !obraSetor || !tema || !responsavel) {
        alert('Por favor, preencha todos os campos obrigatórios (*).');
        return null;
    }

    const dataFormatada = new Date(dataHoraRaw).toLocaleString('pt-BR');

    return {
        dataHoraRaw,
        dataFormatada,
        obraSetor,
        tema,
        responsavel,
        observacoes: observacoes || 'Nenhuma ocorrência registrada.',
        participantes
    };
}

// ============================================================================
// 5. SALVAR NO SUPABASE
// ============================================================================
document.getElementById('ddsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = obterDadosFormulario();
    if (!dados) return;

    const btnSalvar = document.getElementById('btnSalvar');
    btnSalvar.disabled = true;
    btnSalvar.innerHTML = '<span>⏳ Salvando...</span>';

    try {
        const { error } = await supabaseClient
            .from('registros_dds')
            .insert([{
                data_hora: dados.dataHoraRaw,
                obra_setor: dados.obraSetor,
                tema: dados.tema,
                responsavel: dados.responsavel,
                observacoes: dados.observacoes,
                participantes: dados.participantes
            }]);

        if (error) throw error;

        alert('DDS salvo com sucesso no banco de dados!');
        carregarHistorico();
    } catch (err) {
        console.error('Erro ao salvar:', err);
        alert('Erro ao salvar no Supabase.');
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.innerHTML = '<span>💾 Salvar</span>';
    }
});

async function carregarHistorico() {
    const secao = document.getElementById('secaoHistorico');
    const lista = document.getElementById('listaHistorico');
    secao.classList.remove('hidden');
    lista.innerHTML = '<p class="text-slate-500">Buscando registros...</p>';

    try {
        const { data, error } = await supabaseClient
            .from('registros_dds')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        if (!data || data.length === 0) {
            lista.innerHTML = '<p class="text-slate-500">Nenhum registro encontrado no banco.</p>';
            return;
        }

        lista.innerHTML = data.map(item => `
            <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div class="flex justify-between text-xs text-slate-500 mb-1">
                    <span>${new Date(item.data_hora).toLocaleString('pt-BR')}</span>
                    <span class="font-semibold text-slate-700">${item.participantes ? item.participantes.length : 0} presentes</span>
                </div>
                <p class="font-bold text-slate-800">${item.obra_setor}</p>
                <p class="text-slate-600 text-xs mt-0.5">Tema: ${item.tema}</p>
            </div>
        `).join('');
    } catch (err) {
        console.error('Detalhe do erro Supabase:', err);
        lista.innerHTML = `<p class="text-red-500 text-xs font-bold">Erro: ${err.message || 'Falha ao conectar com o banco'}</p>`;
    }
}

// ============================================================================
// 6. COMPARTILHAR WHATSAPP
// ============================================================================
function compartilharWhatsApp() {
    const dados = obterDadosFormulario();
    if (!dados) return;

    const listaNomes = dados.participantes.length > 0
        ? dados.participantes.map((p, i) => `${i + 1}. ${p.nome} (${p.funcao}) | ${p.tipoDoc}: ${p.numDoc} | Adesão: ${p.adesao}`).join('\n')
        : '_Nenhum colaborador listado_';

    const mensagem = 
`*RELATÓRIO DE DDS CCB - SEGURANÇA E BRIGADA*
--------------------------------------
*Data/Hora:* ${dados.dataFormatada}
*Obra/Setor:* ${dados.obraSetor}
*Responsável:* ${dados.responsavel}

*Tema Abordado:*
${dados.tema}

*Observações / Recomendações:*
${dados.observacoes}

*Colaboradores (${dados.participantes.length}):*
${listaNomes}
--------------------------------------
_Gerado via App DDS CCB_`;

    const urlWhatsApp = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`;
    window.open(urlWhatsApp, '_blank');
}

// ============================================================================
// 7. GERAÇÃO DE PDF PROFISSIONAL
// ============================================================================
function gerarPDF() {
    const dados = obterDadosFormulario();
    if (!dados) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Cabeçalho Corporativo Sóbrio
    doc.setFillColor(15, 23, 42); // Tom Slate-900
    doc.rect(0, 0, 210, 28, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('REGISTRO DE DIÁLOGO DIÁRIO DE SEGURANÇA (DDS CCB)', 14, 13);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Controle de Segurança Ocupacional e Brigada de Emergência', 14, 21);

    // Bloco de Informações Gerais
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    
    let y = 36;
    doc.setFont('helvetica', 'bold');
    doc.text('Data e Hora:', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(dados.dataFormatada, 42, y);

    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Obra / Setor:', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(dados.obraSetor, 42, y);

    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Responsável:', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(dados.responsavel, 42, y);

    y += 9;
    doc.setFont('helvetica', 'bold');
    doc.text('Tema Abordado:', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const temaQuebrado = doc.splitTextToSize(dados.tema, 180);
    doc.text(temaQuebrado, 14, y);
    y += (temaQuebrado.length * 5) + 3;

    doc.setFont('helvetica', 'bold');
    doc.text('Observações e Recomendações:', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const obsQuebrada = doc.splitTextToSize(dados.observacoes, 180);
    doc.text(obsQuebrada, 14, y);
    y += (obsQuebrada.length * 5) + 8;

    // Tabela de Colaboradores com Documento e Adesão
    const linhasTabela = dados.participantes.map((p, index) => [
        index + 1,
        p.nome,
        p.funcao,
        `${p.tipoDoc}: ${p.numDoc}`,
        p.adesao,
        `Confirmado (${p.confirmado_em})`
    ]);

    doc.autoTable({
        startY: y,
        head: [['#', 'Colaborador', 'Função', 'Documento', 'N.º Adesão', 'Presença']],
        body: linhasTabela.length > 0 ? linhasTabela : [['-', 'Nenhum colaborador registrado', '-', '-', '-', '-']],
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 2.5 }
    });

    const finalY = doc.lastAutoTable.finalY + 20;
    doc.line(14, finalY, 95, finalY);
    doc.setFontSize(8);
    doc.text(`Assinatura do Responsável: ${dados.responsavel}`, 14, finalY + 4);

    const nomeArquivo = `DDS_CCB_${dados.obraSetor.replace(/[^a-zA-Z0-9]/g, '_')}_${dados.dataHoraRaw.slice(0, 10)}.pdf`;
    doc.save(nomeArquivo);
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}
