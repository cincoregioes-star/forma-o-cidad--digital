window.DEMO_STUDENTS = {
  'FCD-8A-001': { id:'stu-001', name:'Ana Clara Martins', school:'E.M.E.F. Escola Modelo', level:'Fundamental II', levelKey:'fundamental2', grade:'8º ano', className:'A' },
  'FCD-9B-014': { id:'stu-014', name:'Lucas Henrique Alves', school:'E.M.E.F. Escola Modelo', level:'Fundamental II', levelKey:'fundamental2', grade:'9º ano', className:'B' },
  'FCD-1M-021': { id:'stu-021', name:'Mariana Souza Lima', school:'E.E.M. Escola Estadual Modelo', level:'Ensino Médio', levelKey:'medio', grade:'1ª série EM', className:'A' },
  'FCD-2M-008': { id:'stu-008', name:'Pedro Miguel Rocha', school:'E.E.M. Escola Estadual Modelo', level:'Ensino Médio', levelKey:'medio', grade:'2ª série EM', className:'B' }
};

const q = (id, level, type, topic, prompt, options, correct) => ({id,level,type,topic,prompt,options,correct});

window.DEMO_QUESTIONS = [
  // FUNDAMENTAL II — CONCEITO (10)
  q('F-C01','fundamental2','Conceito','Inato e adquirido','Qual alternativa representa melhor uma habilidade adquirida?', ['Tipo sanguíneo','Tocar violão após meses de treino','Cor natural dos olhos','Impressão digital'],1),
  q('F-C02','fundamental2','Conceito','Alteridade','Alteridade significa principalmente:', ['Impor minhas opiniões','Reconhecer o outro como diferente e digno de respeito','Evitar qualquer discordância','Concordar com todos'],1),
  q('F-C03','fundamental2','Conceito','Discernimento','Discernimento é a capacidade de:', ['Agir antes de pensar','Seguir sempre a maioria','Analisar alternativas e consequências antes de decidir','Evitar todas as decisões'],2),
  q('F-C04','fundamental2','Conceito','Autonomia','Autonomia se aproxima mais de:', ['Decidir após refletir','Fazer o que o grupo manda','Agir só por medo de punição','Nunca pedir ajuda'],0),
  q('F-C05','fundamental2','Conceito','Heteronomia','Heteronomia ocorre quando a conduta é orientada principalmente por:', ['Reflexão própria','Pressão externa ou medo','Conhecimento científico','Planejamento pessoal'],1),
  q('F-C06','fundamental2','Conceito','Conformismo','Conformismo é:', ['Avaliar criticamente o grupo','Seguir o grupo sem avaliar suficientemente','Discordar sempre','Procurar ajuda'],1),
  q('F-C07','fundamental2','Conceito','Empatia','Empatia envolve:', ['Considerar sentimentos e perspectivas do outro','Concordar com toda pessoa','Evitar qualquer conflito','Ignorar diferenças'],0),
  q('F-C08','fundamental2','Conceito','Vulnerabilidade','Vulnerabilidade significa:', ['Fraqueza pessoal permanente','Situação de maior exposição a riscos ou menor capacidade de enfrentamento','Falta de inteligência','Ausência de direitos'],1),
  q('F-C09','fundamental2','Conceito','Reciprocidade','Reciprocidade na cidadania significa:', ['Direitos valem apenas para mim','Reconhecer que direitos e responsabilidades também alcançam os outros','Obedecer sem questionar','Evitar participar da vida coletiva'],1),
  q('F-C10','fundamental2','Conceito','Caráter','Na aula, caráter foi apresentado como:', ['Algo totalmente imutável desde o nascimento','Conjunto de princípios e maneiras de agir que se consolidam ao longo da vida','Apenas aparência externa','Somente desempenho escolar'],1),

  // FUNDAMENTAL II — APLICAÇÃO (10)
  q('F-A01','fundamental2','Aplicação','Direitos e deveres','Um aluno quer ouvir música no intervalo. Qual atitude respeita melhor o direito dos outros?', ['Usar volume máximo perto de quem estuda','Usar fones ou volume que não atrapalhe os demais','Exigir silêncio de todos','Tomar a caixa de som de outro aluno'],1),
  q('F-A02','fundamental2','Aplicação','Vida digital','Você recebeu uma foto privada de um colega. A atitude mais responsável é:', ['Publicar para amigos','Guardar ou apagar e não compartilhar sem autorização','Criar uma montagem','Enviar para outro grupo'],1),
  q('F-A03','fundamental2','Aplicação','Convivência','Você discorda da opinião de um colega. Qual reação demonstra alteridade?', ['Atacar a pessoa','Ouvir, argumentar e respeitar sua dignidade','Espalhar apelidos','Excluir o colega do grupo'],1),
  q('F-A04','fundamental2','Aplicação','Pressão do grupo','Todos começam a rir de um colega. Você percebe que ele está desconfortável. Uma atitude autônoma seria:', ['Rir para não ficar de fora','Avaliar a situação e não participar da humilhação','Filmar escondido','Compartilhar depois'],1),
  q('F-A05','fundamental2','Aplicação','Proteção','Diante de uma situação séria que você não consegue resolver, a atitude mais adequada é:', ['Ficar sozinho com o problema','Procurar adulto ou serviço de confiança adequado à situação','Publicar tudo na internet','Confrontar todos sem apoio'],1),
  q('F-A06','fundamental2','Aplicação','Bullying','Um apelido é repetido todos os dias mesmo após o colega pedir que parem. O mais adequado é:', ['Dizer que é só brincadeira','Interromper a situação e procurar ajuda quando necessário','Criar outro apelido','Ignorar porque todo mundo faz'],1),
  q('F-A07','fundamental2','Aplicação','Discernimento','Antes de encaminhar uma mensagem alarmante no grupo, discernimento recomenda:', ['Compartilhar primeiro e verificar depois','Verificar fonte, contexto e confiabilidade','Apagar todas as mensagens','Acreditar se veio de um conhecido'],1),
  q('F-A08','fundamental2','Aplicação','Responsabilidade','Você não iniciou uma zombaria, mas ajudou a divulgá-la. Isso significa que:', ['Não existe responsabilidade alguma','Sua participação também precisa ser considerada','A culpa é apenas de quem começou','Compartilhar nunca tem consequência'],1),
  q('F-A09','fundamental2','Aplicação','Inato e adquirido','Um colega diz “não sei desenhar, então nunca vou aprender”. A aula sugere que:', ['Habilidades podem ser desenvolvidas com prática','Toda habilidade é totalmente inata','Treino nunca muda nada','Só quem nasce sabendo consegue'],0),
  q('F-A10','fundamental2','Aplicação','Cidadania','Cuidar do patrimônio da escola é exemplo de:', ['Responsabilidade coletiva','Favor opcional ao diretor','Atitude sem relação com cidadania','Apenas regra de professores'],0),

  // FUNDAMENTAL II — SITUAÇÃO-PROBLEMA (10)
  q('F-S01','fundamental2','Situação-problema','Cyberbullying','Uma montagem humilhante de um aluno começa a circular. Você recebe no grupo. Qual resposta demonstra maior responsabilidade?', ['Repassar para um amigo','Não compartilhar e buscar apoio se a situação estiver causando dano','Salvar para rir depois','Comentar com emojis'],1),
  q('F-S02','fundamental2','Situação-problema','Conformismo','Seu grupo decide excluir um colega de todas as atividades “porque ninguém gosta dele”. O que melhor evita o conformismo?', ['Aceitar para manter amizade','Perguntar os motivos, avaliar a injustiça e propor outra atitude','Criar outro grupo secreto','Ignorar o colega'],1),
  q('F-S03','fundamental2','Situação-problema','Direitos','Um aluno usa a quadra inteira e impede outros de participar. Qual princípio está em jogo?', ['Reciprocidade no uso de um espaço coletivo','Direito absoluto de quem chegou primeiro','Ausência de qualquer regra','Somente gosto pessoal'],0),
  q('F-S04','fundamental2','Situação-problema','Proteção','Um estudante conta que está vivendo algo sério e pede ajuda. O colega deve:', ['Prometer resolver tudo sozinho','Incentivar a busca por adulto ou serviço responsável e não expor o relato','Publicar para conseguir apoio','Interrogar a pessoa na frente da turma'],1),
  q('F-S05','fundamental2','Situação-problema','Discernimento','Um perfil desconhecido oferece prêmio e pede senha para liberar o valor. Qual atitude é mais segura?', ['Enviar a senha rapidamente','Não fornecer dados e procurar orientação/verificar a origem','Mandar a senha de um amigo','Compartilhar com a turma'],1),
  q('F-S06','fundamental2','Situação-problema','Empatia','Um colega erra durante uma apresentação e a turma ri. Qual atitude demonstra empatia?', ['Gravar o erro','Evitar a humilhação e apoiar a continuidade da apresentação','Criar meme','Repetir o erro em voz alta'],1),
  q('F-S07','fundamental2','Situação-problema','Autonomia','Amigos pressionam você a postar uma mensagem ofensiva. Autonomia significa:', ['Postar para provar lealdade','Decidir segundo reflexão própria e consequências','Deixar outra pessoa postar em seu celular','Fazer e apagar depois'],1),
  q('F-S08','fundamental2','Situação-problema','Inato e adquirido','Dois alunos começam com níveis diferentes em uma atividade. Qual conclusão é mais coerente?', ['O que começa pior nunca melhora','Diferenças iniciais existem, mas prática e oportunidades podem desenvolver habilidades','Apenas talento importa','Aprender é impossível sem facilidade inicial'],1),
  q('F-S09','fundamental2','Situação-problema','Responsabilidade','Um aluno vê uma agressão e percebe risco imediato. O que é mais adequado?', ['Entrar em confronto sem avaliar risco','Buscar rapidamente um adulto responsável ou serviço adequado','Filmar para ter prova','Fingir que não viu'],1),
  q('F-S10','fundamental2','Situação-problema','Cidadania','A turma precisa decidir como usar um espaço comum. Qual processo é mais cidadão?', ['Uma pessoa decide por todos','Ouvir propostas, discutir impactos e estabelecer regras coletivas','Vence quem falar mais alto','Não criar nenhuma regra'],1),

  // ENSINO MÉDIO — CONCEITO (10)
  q('M-C01','medio','Conceito','Inato e adquirido','Qual afirmação representa melhor a relação entre inato e adquirido?', ['Tudo é determinado ao nascer','Tudo depende apenas da escola','Desenvolvimento resulta da interação entre predisposições, ambiente, experiência e aprendizagem','Nada pode mudar depois da infância'],2),
  q('M-C02','medio','Conceito','Autodeterminação','Autodeterminação é:', ['Participar conscientemente das decisões sobre a própria trajetória','Recusar qualquer orientação','Seguir sempre a opinião da maioria','Ter certeza absoluta sobre o futuro'],0),
  q('M-C03','medio','Conceito','Identidade e reputação','Reputação é:', ['Percepção que outras pessoas formam sobre alguém','Um traço genético','Uma senha pessoal','O mesmo que identidade biológica'],0),
  q('M-C04','medio','Conceito','Evidência','Evidência é:', ['Qualquer opinião repetida muitas vezes','Informação verificável capaz de sustentar ou contestar uma afirmação','Mensagem de influenciador','Aquilo em que acredito'],1),
  q('M-C05','medio','Conceito','Viés','Viés pode ser entendido como:', ['Tendência que influencia interpretação e julgamento','Prova científica definitiva','Ausência total de opinião','Uma habilidade física'],0),
  q('M-C06','medio','Conceito','Omissão','Omissão significa:', ['Agir imediatamente','Não agir diante de uma situação','Assumir liderança','Coletar evidências'],1),
  q('M-C07','medio','Conceito','Aptidão e habilidade','Qual diferença está mais correta?', ['Aptidão é facilidade/predisposição; habilidade é capacidade desenvolvida','São sinônimos exatos','Habilidade é sempre inata','Aptidão só aparece depois de treinamento'],0),
  q('M-C08','medio','Conceito','Protagonismo','Protagonismo significa:', ['Controlar as decisões dos outros','Participar ativamente da própria trajetória e da vida coletiva','Nunca mudar de plano','Resolver tudo sem ajuda'],1),
  q('M-C09','medio','Conceito','Resiliência','Resiliência é:', ['Suportar tudo sozinho','Capacidade de enfrentar dificuldades, reorganizar-se e continuar, usando apoio quando necessário','Ignorar problemas','Não sentir emoções'],1),
  q('M-C10','medio','Conceito','Responsabilidade','Responsabilidade envolve:', ['Reconhecer consequências ligadas às próprias ações e decisões','Apenas obedecer a ordens','Evitar escolhas','Nunca cometer erros'],0),

  // ENSINO MÉDIO — APLICAÇÃO (10)
  q('M-A01','medio','Aplicação','Identidade digital','Antes de publicar algo impulsivo, uma atitude responsável seria:', ['Pensar em contexto, audiência e possíveis consequências','Publicar e apagar depois','Usar perfil falso','Marcar mais pessoas'],0),
  q('M-A02','medio','Aplicação','Pensamento crítico','Uma notícia apresenta “aumento de 400%” sem fonte. O primeiro passo deveria ser:', ['Compartilhar porque parece importante','Buscar fonte original, método e evidências','Aceitar porque há um gráfico','Ignorar qualquer dado estatístico'],1),
  q('M-A03','medio','Aplicação','Autodeterminação','Um estudante ainda não sabe qual carreira seguir. Uma atitude de protagonismo é:', ['Escolher aleatoriamente','Explorar possibilidades, buscar informação e revisar o plano conforme aprende','Não pensar mais no assunto','Copiar a escolha dos amigos'],1),
  q('M-A04','medio','Aplicação','Aptidão e habilidade','Uma pessoa tem facilidade para falar em público, mas nunca praticou. O mais adequado é concluir que:', ['Facilidade inicial substitui treinamento','Aptidão pode ajudar, mas habilidade melhora com prática','Treino piora o desempenho','Habilidade é fixa'],1),
  q('M-A05','medio','Aplicação','Omissão','Em uma situação de humilhação, permanecer observando sem agir:', ['Nunca tem relação com responsabilidade','É uma decisão que deve ser analisada conforme contexto e possibilidades seguras de ação','É sempre igual a agredir','É obrigatório'],1),
  q('M-A06','medio','Aplicação','Reputação','Um comentário ofensivo publicado anos atrás pode:', ['Nunca ter efeito futuro','Ser reencontrado e influenciar a percepção de outras pessoas','Desaparecer automaticamente','Virar informação privada por padrão'],1),
  q('M-A07','medio','Aplicação','Viés','Você acredita fortemente em uma ideia e só procura fontes que confirmam sua opinião. Isso pode indicar:', ['Viés de confirmação','Evidência definitiva','Neutralidade total','Resiliência'],0),
  q('M-A08','medio','Aplicação','Resiliência','Após falhar em uma seleção, uma atitude resiliente seria:', ['Concluir que nunca terá capacidade','Analisar o que ocorreu, buscar apoio, ajustar estratégia e tentar novas oportunidades','Esconder o resultado de todos','Desistir de qualquer plano'],1),
  q('M-A09','medio','Aplicação','Liberdade e responsabilidade','Ter liberdade de expressão significa:', ['Poder dizer qualquer coisa sem consequência','Poder se expressar dentro de limites jurídicos e de responsabilidade em relação aos direitos de outros','Nunca poder ser criticado','Não precisar verificar fatos'],1),
  q('M-A10','medio','Aplicação','Projeto de vida','Projeto de vida é melhor entendido como:', ['Previsão exata do futuro','Processo de construção e revisão de escolhas e possibilidades','Obrigação de escolher uma profissão imediatamente','Plano que nunca pode mudar'],1),

  // ENSINO MÉDIO — SITUAÇÃO-PROBLEMA (10)
  q('M-S01','medio','Situação-problema','Desinformação','Um vídeo viral usa imagens reais, mas fora de contexto. Antes de compartilhar, a melhor ação é:', ['Confiar porque as imagens são reais','Verificar data, origem, contexto e fontes independentes','Compartilhar com aviso “não sei se é verdade”','Observar apenas os comentários'],1),
  q('M-S02','medio','Situação-problema','Identidade digital','Uma empresa ou universidade encontra conteúdo público antigo de um candidato. Qual conceito da aula se relaciona mais diretamente?', ['Reputação digital','Tipo sanguíneo','Aptidão inata','Vulnerabilidade física'],0),
  q('M-S03','medio','Situação-problema','Omissão','Você presencia cyberbullying em um grupo. Qual resposta é mais responsável e segura?', ['Aumentar a exposição para denunciar','Não participar, preservar evidências quando necessário e procurar canal/adulto responsável adequado','Responder com outra humilhação','Sair do grupo e nunca contar a ninguém'],1),
  q('M-S04','medio','Situação-problema','Autodeterminação','Sua família prefere uma carreira, seus amigos outra e você ainda está pesquisando. Autodeterminação envolve:', ['Ignorar todos','Ouvir orientações, buscar informações e construir decisão própria responsável','Escolher a opção dos amigos','Adiar para sempre'],1),
  q('M-S05','medio','Situação-problema','Evidência','Um influenciador diz que um método “funciona para todos” usando apenas depoimentos. O que falta principalmente?', ['Mais seguidores','Evidências verificáveis e método confiável','Música no vídeo','Comentários positivos'],1),
  q('M-S06','medio','Situação-problema','Aptidão e habilidade','Um estudante com pouca experiência em programação recebe oportunidade de curso. Qual interpretação é mais coerente?', ['A falta de experiência prova incapacidade','Habilidades podem ser desenvolvidas com aprendizagem e prática','Somente quem começou criança aprende','Aptidão inicial determina o resultado final'],1),
  q('M-S07','medio','Situação-problema','Resiliência','Um jovem enfrenta repetidas dificuldades e começa a se sentir sobrecarregado. Resiliência, nesse contexto, inclui:', ['Suportar sozinho para provar força','Buscar apoio, reorganizar estratégias e continuar dentro de limites possíveis','Negar qualquer dificuldade','Comparar-se com quem teve mais facilidade'],1),
  q('M-S08','medio','Situação-problema','Responsabilidade digital','Um colega envia conteúdo privado e pede sigilo. Qual ação demonstra maior responsabilidade?', ['Compartilhar apenas com pessoa de confiança','Respeitar a privacidade e não redistribuir sem autorização, salvo situações de proteção que exijam procurar ajuda adequada','Publicar sem nome','Fazer print e guardar em nuvem pública'],1),
  q('M-S09','medio','Situação-problema','Viés','Duas fontes apresentam interpretações diferentes sobre o mesmo dado. Uma análise crítica deveria:', ['Escolher a que concorda com você','Comparar fontes, metodologia, contexto e evidências','Rejeitar ambas sem ler','Decidir pelo título'],1),
  q('M-S10','medio','Situação-problema','Projeto de vida','Um plano profissional deixa de fazer sentido após novas experiências. Protagonismo significa:', ['Manter o plano para não parecer indeciso','Reavaliar informações, valores e possibilidades e ajustar a trajetória','Abandonar qualquer planejamento','Esperar outra pessoa decidir'],1)
];


window.DEMO_SCHOOLS = [
  {id:'sch-001',name:'E.M.E.F. Escola Modelo',district:'Sede',municipality:'Beberibe',latitude:-4.1792,longitude:-38.1290,network:'Municipal'},
  {id:'sch-002',name:'E.M.E.F. Horizonte',district:'Morro Branco',municipality:'Beberibe',latitude:-4.1592,longitude:-38.1158,network:'Municipal'},
  {id:'sch-003',name:'E.E.M. Escola Estadual Modelo',district:'Sede',municipality:'Beberibe',latitude:-4.1770,longitude:-38.1260,network:'Estadual'},
  {id:'sch-004',name:'E.M.E.F. Caminhos do Saber',district:'Parajuru',municipality:'Beberibe',latitude:-4.3935,longitude:-37.8465,network:'Municipal'},
  {id:'sch-005',name:'E.M.E.F. Lagoa Viva',district:'Sucatinga',municipality:'Beberibe',latitude:-4.3320,longitude:-38.0320,network:'Municipal'}
];

window.generateDemoResults = function(){
  const schools = window.DEMO_SCHOOLS.map(s=>s.name);
  const profiles = [
    ['Fundamental II','6º ano','A'],['Fundamental II','7º ano','A'],['Fundamental II','8º ano','A'],['Fundamental II','9º ano','B'],
    ['Ensino Médio','1ª série EM','A'],['Ensino Médio','2ª série EM','B'],['Ensino Médio','3ª série EM','A']
  ];
  const firstNames=['Ana','Lucas','Mariana','Pedro','Beatriz','João','Camila','Rafael','Larissa','Gabriel','Júlia','Mateus','Sofia','Davi','Isabela','Miguel','Helena','Arthur','Laura','Enzo'];
  const lastNames=['Silva','Lima','Martins','Souza','Rocha','Alves','Costa','Oliveira','Santos','Ferreira'];
  const topics=['Cidadania','Convivência','Vida digital','Pensamento crítico','Projeto de vida'];
  const rows=[];
  for(let i=0;i<84;i++){
    const p=profiles[i%profiles.length];
    const school=schools[i%schools.length];
    const score=7 + ((i*7)%9); // 7..15
    const total=15;
    const themeScores={};
    topics.forEach((t,j)=>{ themeScores[t]=Math.max(35,Math.min(100,52+((i*11+j*13)%49))); });
    rows.push({
      id:'r'+(i+1),
      name:firstNames[i%firstNames.length]+' '+lastNames[(i*3)%lastNames.length],
      school, level:p[0], grade:p[1], className:p[2],
      score,total,percent:Math.round(score/total*100), completed:i%11!==0,
      date:`2026-09-${String(1+(i%5)).padStart(2,'0')}`,
      themeScores,
      questionErrors:{'Inato × adquirido':30+((i*3)%35),'Autonomia × heteronomia':45+((i*5)%35),'Discernimento digital':25+((i*7)%40),'Evidência e viés':35+((i*2)%45),'Responsabilidade/omissão':20+((i*9)%50)}
    });
  }
  return rows;
};
