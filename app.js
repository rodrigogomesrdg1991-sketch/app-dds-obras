// ============================================================================
// 1. CONFIGURAÇÃO DO SUPABASE
// ============================================================================
const SUPABASE_URL = 'https://ddkpujfilbkcingsvrgj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_l3uyb9IVq0C_ng7Z_2bnGw_yhftW4TV';

// Inicializa o cliente Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Estado local dos participantes
let participantes = [];

// ============================================================================
// 2. INICIALIZAÇÃO DA PÁGINA
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Preenche automaticamente com a data e hora local atual
    const agora = new Date();
    agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
    document.getElementById('dataHora').value = agora.toISOString().slice(0, 16);
});

// ============================================================================
// 3. GESTÃO DE PARTICIPANTES (PRESENÇA / ASSINATURA RÁPIDA)
// ============================================================================
function adicionarParticipante() {
    const inputNome = document.getElementById('novoParticipanteNome');
    const inputFuncao = document.getElementById('novoParticipanteFuncao');

    const nome = inputNome.value.trim();
    const funcao = inputFuncao.value.trim() || 'Operacional';

    if (!nome) {
        alert('Digite o nome do colaborador antes de adicionar.');
        inputNome.focus();
        return;
    }

    // Adiciona ao array com timestamp de confirmação
    participantes.push({
        nome: nome,
        funcao: funcao,
        confirmado_em: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    });

    // Limpa os campos e atualiza a tela
    inputNome.value = '';
    inputFuncao.value = '';
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
            <div>
                <span class="font-semibold text-slate-800">${index + 1}. ${p.nome}</span>
                <span class="text-xs text-slate-500 block">${p.funcao} • Confirmado às ${p.confirmado_em}</span>
            </div>
            <button type="button" onclick="removerParticipante(${index})" class="text-red-500 hover:text-red-700 font-bold px-2">
                ✕
            </button>
        `;
        listaUI.appendChild(li);
    });

    contador.textContent = `${participantes.length} colaborador(s) registrado(s).`;
}

// ============================================================================
// 4. COLETA E VALIDAÇÃO DOS DADOS DO FORMULÁRIO
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
// 5. PERSISTÊNCIA NO SUPABASE
// ============================================================================
document.getElementById('ddsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = obterDadosFormulario();
    if (!dados) return;

    const btnSalvar = document.getElementById('btnSalvar');
    btnSalvar.disabled = true;
    btnSalvar.textContent = 'Salvando no banco...';

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
        alert('Erro ao salvar no Supabase. Verifique sua conexão ou as chaves da API.');
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.textContent = 'Salvar Registro no Banco';
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

        if (data.length === 0) {
            lista.innerHTML = '<p class="text-slate-500">Nenhum registro encontrado.</p>';
            return;
        }

        lista.innerHTML = data.map(item => `
            <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div class="flex justify-between text-xs text-slate-500 mb-1">
                    <span>${new Date(item.data_hora).toLocaleString('pt-BR')}</span>
                    <span class="font-semibold text-amber-700">${item.participantes.length} presentes</span>
                </div>
                <p class="font-bold text-slate-800">${item.obra_setor}</p>
                <p class="text-slate-600 text-xs mt-0.5">Tema: ${item.tema}</p>
            </div>
        `).join('');
    } catch (err) {
        lista.innerHTML = '<p class="text-red-500">Erro ao carregar histórico.</p>';
    }
}

// ============================================================================
// 6. INTEGRAÇÃO COM WHATSAPP (API LINK DIRETO)
// ============================================================================
function compartilharWhatsApp() {
    const dados = obterDadosFormulario();
    if (!dados) return;

    const listaNomes = dados.participantes.length > 0
        ? dados.participantes.map((p, i) => `${i + 1}. ${p.nome} (${p.funcao})`).join('\n')
        : '_Nenhum participante listado_';

    // Monta o texto estruturado com formatação nativa do WhatsApp (*negrito*, _itálico_)
    const mensagem = 
`*RELATÓRIO DE DDS - SEGURANÇA DO TRABALHO*
--------------------------------------
*Data/Hora:* ${dados.dataFormatada}
*Obra/Setor:* ${dados.obraSetor}
*Responsável:* ${dados.responsavel}

*Tema Abordado:*
${dados.tema}

*Observações / Recomendações:*
${dados.observacoes}

*Participantes (${dados.participantes.length}):*
${listaNomes}
--------------------------------------
_Gerado via App DDS Campo_`;

    // Codifica a string para URL e abre o WhatsApp
    const urlWhatsApp = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`;
    window.open(urlWhatsApp, '_blank');
}

// ============================================================================
// 7. GERAÇÃO DE PDF PROFISSIONAL (jsPDF + AutoTable)
// ============================================================================
function gerarPDF() {
    const dados = obterDadosFormulario();
    if (!dados) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Cabeçalho Corporativo
    doc.setFillColor(217, 119, 6); // Cor Amber-600
    doc.rect(0, 0, 210, 28, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('REGISTRO DE DIÁLOGO DIÁRIO DE SEGURANÇA (DDS)', 14, 13);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Controle de Segurança e Saúde Ocupacional em Obras', 14, 21);

    // Bloco de Informações Gerais
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    
    let y = 38;
    doc.setFont('helvetica', 'bold');
    doc.text('Data e Hora:', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(dados.dataFormatada, 45, y);

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Obra / Setor:', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(dados.obraSetor, 45, y);

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Responsável:', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(dados.responsavel, 45, y);

    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Tema Abordado:', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const temaQuebrado = doc.splitTextToSize(dados.tema, 180);
    doc.text(temaQuebrado, 14, y);
    y += (temaQuebrado.length * 6) + 4;

    doc.setFont('helvetica', 'bold');
    doc.text('Observações e Recomendações:', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const obsQuebrada = doc.splitTextToSize(dados.observacoes, 180);
    doc.text(obsQuebrada, 14, y);
    y += (obsQuebrada.length * 6) + 8;

    // Tabela de Participantes
    const linhasTabela = dados.participantes.map((p, index) => [
        index + 1,
        p.nome,
        p.funcao,
        `Confirmado (${p.confirmado_em})`
    ]);

    doc.autoTable({
        startY: y,
        head: [['#', 'Nome do Colaborador', 'Função', 'Registro / Presença']],
        body: linhasTabela.length > 0 ? linhasTabela : [['-', 'Nenhum participante registrado', '-', '-']],
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 3 }
    });

    // Assinatura do Responsável no rodapé da tabela
    const finalY = doc.lastAutoTable.finalY + 25;
    doc.line(14, finalY, 95, finalY);
    doc.setFontSize(9);
    doc.text(`Assinatura: ${dados.responsavel}`, 14, finalY + 5);

    // Salva o arquivo com nome padronizado
    const nomeArquivo = `DDS_${dados.obraSetor.replace(/[^a-zA-Z0-9]/g, '_')}_${dados.dataHoraRaw.slice(0, 10)}.pdf`;
    doc.save(nomeArquivo);
}
