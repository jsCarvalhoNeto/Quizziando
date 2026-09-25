// src/lib/geminiQuizGenerator.ts
// Gerador Inteligente de Questões via Google Gemini API para o Quizziando

export interface GeneratedQuestionItem {
  question_text: string;
  alternatives: Array<{ text: string; isCorrect: boolean }>;
  time_limit: number;
  explanation?: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface GenerateQuestionsOptions {
  apiKey: string;
  model?: string;
  themeOrPrompt: string;
  categoryName?: string;
  quantity: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'all';
  pastedText?: string;
  file?: File | null;
  timeLimit?: number;
}

/**
 * Extrai texto de arquivos PDF ou texto plano (.txt, .md, etc.)
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!(window as any).pdfjsLib) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
          document.head.appendChild(script);
          await new Promise((res, rej) => {
            script.onload = () => {
              try {
                (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
                res(true);
              } catch (e) {
                rej(e);
              }
            };
            script.onerror = () => rej(new Error('Não foi possível carregar a biblioteca de leitura de PDF.'));
          });
        }

        const pdfjsLib = (window as any).pdfjsLib;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = '';
        const maxPages = Math.min(pdf.numPages, 10); // Limita em até 10 páginas para evitar estourar tokens

        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(' ');
          text += pageText + '\n';
        }
        resolve(text.trim());
      } catch (err: any) {
        reject(new Error(`Falha ao ler o PDF: ${err?.message || 'Arquivo corrompido ou ilegível'}`));
      }
    });
  }

  // Arquivos de texto (.txt, .md, etc.)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string || '').trim());
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo de texto.'));
    reader.readAsText(file);
  });
}

/**
 * Envia prompt estruturado para o Google Gemini e retorna as questões geradas
 */
export async function generateQuestionsWithGemini(options: GenerateQuestionsOptions): Promise<GeneratedQuestionItem[]> {
  const {
    apiKey,
    model = 'gemini-1.5-flash',
    themeOrPrompt,
    categoryName = 'Geral',
    quantity = 5,
    difficulty = 'all',
    pastedText = '',
    file = null,
    timeLimit = 20,
  } = options;

  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error('Chave de API do Gemini não informada. Insira sua chave para continuar.');
  }

  let fileContent = '';
  if (file) {
    fileContent = await extractTextFromFile(file);
  }

  const combinedContext = [
    pastedText.trim() ? `TEXTO BASE INFORMADO PELO EDUCADOR:\n"""\n${pastedText.trim().slice(0, 10000)}\n"""` : '',
    fileContent.trim() ? `CONTEÚDO EXTRAÍDO DO ARQUIVO (${file?.name}):\n"""\n${fileContent.slice(0, 12000)}\n"""` : '',
  ].filter(Boolean).join('\n\n');

  const difficultyInstruction = difficulty === 'all'
    ? 'Distribua equilibradamente o nível de dificuldade entre fácil, médio e difícil.'
    : `O nível de dificuldade de todas as questões deve ser estritamente: "${difficulty}".`;

  const promptText = `Você é um especialista em avaliação educacional, pedagogia e game design para quizzes interativos.
Crie exatamente ${quantity} questão(ões) inéditas de múltipla escolha com alta precisão e qualidade técnica sobre o tema: "${themeOrPrompt.trim() || categoryName}".
Categoria do Quiz: "${categoryName}".
${difficultyInstruction}

${combinedContext ? `Utilize prioritariamente as informações e fatos presentes no material de apoio fornecido a seguir:\n${combinedContext}` : ''}

DIRETRIZES OBRIGATÓRIAS:
1. Enunciado da Pergunta: Máximo de 130 caracteres. Seja claro, direto e instigante. Evite enrolação.
2. Alternativas: Exatamente 4 alternativas por questão. Cada alternativa deve ter no MÁXIMO 80 caracteres.
3. Precisão: Exatamente 1 alternativa correta (isCorrect: true) e 3 incorretas porém plausíveis (isCorrect: false).
4. Distribuição: Varie aleatoriamente a posição da alternativa correta entre as 4 opções em cada pergunta.
5. Explicação: Forneça uma explicação concisa e pedagógica (1 a 2 frases) justificando por que a opção correta é a verdadeira.
6. Idioma: Todo o conteúdo deve ser gerado estritamente em Português do Brasil.

RETORNE EXCLUSIVAMENTE UM ARRAY JSON VÁLIDO. NÃO inclua blocos de formatação markdown (\`\`\`json ou \`\`\`), nem comentários antes ou depois.

Exemplo de formato esperado:
[
  {
    "question_text": "Qual componente é responsável pelo processamento de instruções em um computador?",
    "time_limit": ${timeLimit},
    "difficulty": "medium",
    "explanation": "A CPU (Unidade Central de Processamento) executa os cálculos e processa as instruções dos programas.",
    "alternatives": [
      { "text": "CPU (Processador)", "isCorrect": true },
      { "text": "Memória RAM", "isCorrect": false },
      { "text": "Disco Rígido (HD)", "isCorrect": false },
      { "text": "Placa-Mãe", "isCorrect": false }
    ]
  }
]`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
      }
    }),
  });

  if (!response.ok) {
    let details = '';
    try {
      const errJson = await response.json();
      details = errJson?.error?.message || '';
    } catch {}

    if (response.status === 429) {
      throw new Error('Limite de requisições excedido na API do Gemini (Erro 429). Aguarde 1 a 2 minutos antes de tentar novamente ou reduza o número de questões.');
    }
    if (response.status === 400 || response.status === 403) {
      throw new Error(`Chave de API do Gemini inválida ou sem permissão de acesso ao modelo ${model} (Erro ${response.status}). Verifique sua chave.`);
    }
    if (response.status === 404) {
      throw new Error(`Modelo "${model}" não encontrado no Gemini (Erro 404). Selecione outro modelo suportado (ex: gemini-1.5-flash).`);
    }
    throw new Error(`Erro na API do Gemini (${response.status}): ${details || response.statusText}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error('A IA não retornou nenhuma resposta. Tente novamente com um prompt mais específico.');
  }

  const cleanedJson = rawText
    .replace(/^```json/im, '')
    .replace(/^```/im, '')
    .replace(/```$/m, '')
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleanedJson);
  } catch (err) {
    // Tenta encontrar o array dentro do texto
    const arrayMatch = cleanedJson.match(/\[\s*\{.*\}\s*\]/s);
    if (arrayMatch) {
      try {
        parsed = JSON.parse(arrayMatch[0]);
      } catch (err2) {
        throw new Error('Não foi possível interpretar a resposta estruturada do Gemini. Tente novamente.');
      }
    } else {
      throw new Error('Formato de resposta inválido retornado pela IA. Tente novamente.');
    }
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];
  const validQuestions: GeneratedQuestionItem[] = [];

  for (const item of items) {
    if (!item.question_text || !Array.isArray(item.alternatives) || item.alternatives.length !== 4) {
      continue;
    }

    const hasCorrect = item.alternatives.some((a: any) => a.isCorrect === true);
    if (!hasCorrect) {
      // Se nenhuma estiver marcada como correta, marca a primeira por fallback
      item.alternatives[0].isCorrect = true;
    }

    validQuestions.push({
      question_text: String(item.question_text).trim(),
      alternatives: item.alternatives.map((alt: any) => ({
        text: String(alt.text || '').trim().slice(0, 85),
        isCorrect: Boolean(alt.isCorrect),
      })),
      time_limit: Number(item.time_limit) || timeLimit,
      explanation: item.explanation ? String(item.explanation).trim() : null,
      difficulty: ['easy', 'medium', 'hard'].includes(item.difficulty) ? item.difficulty : 'medium',
    });
  }

  if (validQuestions.length === 0) {
    throw new Error('A IA não conseguiu estruturar questões válidas a partir do conteúdo informado. Tente fornecer mais contexto ou simplificar o tema.');
  }

  return validQuestions;
}
