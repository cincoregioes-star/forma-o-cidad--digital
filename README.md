# Projeto Formação Cidadã Digital — V1.3

## Estrutura geral

A plataforma continua separada em dois ambientes:

- `index.html` — **Painel administrativo**. Somente administradores.
- `app.html` — **App do estudante**. Link enviado pela escola às turmas.

O estudante não acessa dashboard, resultados gerais, mapa, comparação entre escolas, cadastro de alunos ou administração de códigos.

---

# Novidades V1.3

## 1. Dados da Rede

Nova área administrativa para importar dados em lote por:

- `.xlsx`
- `.xls`
- `.csv`

A leitura usa SheetJS 0.20.3 no navegador.

### Importação de escolas

Colunas aceitas no modelo:

- `codigo_escola` — opcional; pode receber código INEP ou identificador interno;
- `escola` — obrigatório;
- `distrito`;
- `municipio`;
- `rede`;
- `latitude`;
- `longitude`.

Se a escola já existir, a importação atualiza os dados em vez de criar outra unidade.

### Importação de alunos

Colunas aceitas:

- `matricula` — recomendada, mas opcional;
- `aluno` — obrigatório;
- `escola` — obrigatório;
- `nivel` — `Fundamental II` ou `Ensino Médio`;
- `serie`;
- `turma`;
- `validade_codigo` — opcional.

A escola precisa estar cadastrada antes da importação dos alunos.

## 2. Pré-validação obrigatória

Nenhum dado é gravado quando o administrador apenas seleciona a planilha.

O painel primeiro apresenta:

- total de linhas;
- linhas válidas;
- avisos;
- erros impeditivos;
- pré-visualização linha a linha.

Se houver erro, o botão **Importar registros** fica bloqueado.

Exemplos de bloqueio:

- escola não localizada;
- nível inválido;
- série vazia;
- turma vazia;
- latitude/longitude inválida;
- linha duplicada na própria planilha.

Avisos não impedem a importação. Exemplo: aluno sem matrícula externa.

## 3. Geração automática de códigos

Na importação de alunos, a opção **Gerar códigos após importar** vem marcada por padrão.

Fluxo:

1. importar alunos;
2. validar;
3. confirmar;
4. alunos são cadastrados/atualizados;
5. sistema verifica se já existe código ativo;
6. cria apenas os códigos necessários;
7. mostra a lista completa uma única vez;
8. administrador baixa o CSV;
9. banco mantém apenas hash e referência mascarada.

## 4. Modelos de planilha

A própria tela **Dados da Rede** possui botões para gerar:

- modelo XLSX;
- modelo CSV.

O modelo muda automaticamente entre **Alunos** e **Escolas**.

## 5. Auditoria das importações

Nova tabela `import_batches` registra:

- data/hora;
- tipo da importação;
- nome do arquivo;
- linhas recebidas;
- incluídos;
- atualizados;
- ignorados;
- códigos gerados.

O histórico aparece dentro do painel administrativo.

---

# Melhorias estruturais da V1.3

## Dashboard conta todos os alunos cadastrados

A V1.2 montava parte da visão administrativa a partir dos alunos que já possuíam código.

Na V1.3, `admin-dashboard` consulta diretamente a tabela `students`. Assim:

- aluno importado aparece na base administrativa mesmo antes de gerar código;
- total de alunos cadastrados fica mais fiel;
- alunos ainda sem diagnóstico aparecem como pendentes.

## Paginação administrativa

O carregamento de dados em Edge Functions foi preparado para ultrapassar o limite comum de 1.000 registros por consulta, usando paginação interna.

Isso é importante para uso municipal.

---

# Supabase — atualização da V1.2 para V1.3

Se ainda não existe banco instalado, execute:

`supabase/schema.sql`

Se a V1.2 já estiver instalada, execute somente:

`supabase/update-v1.3.sql`

Depois publique a nova Edge Function:

- `admin-import`

As funções necessárias passam a ser:

- `redeem-code`
- `start-diagnostic`
- `submit-diagnostic`
- `admin-dashboard`
- `admin-codes`
- `admin-import`

## Campos novos

### `schools`

- `reference_code`

### `students`

- `registration_code`

### nova tabela `import_batches`

Registra o histórico das importações administrativas.

---

# Segurança

A arquitetura continua com as tabelas sensíveis fechadas para acesso direto do navegador.

- RLS habilitada;
- navegador usa apenas publishable key;
- operações administrativas passam por Edge Functions autenticadas;
- secret key/service role nunca deve ser inserida em `config.js`;
- código de aluno completo não é armazenado em texto puro.

As funções administrativas conferem se o usuário existe e está ativo na tabela `admin_users`.

---

# Modo demonstração

Em `assets/js/config.js`:

```js
demoMode: true
```

### Administrador

- E-mail: `admin@formacaocidada.local`
- Senha: `Demo@2026`

### App do estudante

- `FCD-8A-001`
- `FCD-9B-014`
- `FCD-1M-021`
- `FCD-2M-008`

A importação também funciona em demonstração, sem gravar em Supabase.

---

# Fluxo recomendado de implantação municipal

## Preparação inicial

1. Importar todas as escolas.
2. Conferir mapa e distritos.
3. Importar alunos por escola/turma.
4. Manter marcada a geração automática de códigos.
5. Baixar o CSV dos códigos imediatamente.

## Aplicação

1. Ministrar a aula presencial.
2. Escola envia o mesmo link `app.html` no grupo da turma.
3. Código individual é entregue ao estudante.
4. O aluno acessa a aula digital.
5. Responde o diagnóstico.
6. Supabase registra as respostas.
7. Administrador acompanha dashboard.

---

# Arquivos principais V1.3

```text
index.html
app.html
manifest.webmanifest
sw.js
assets/
  css/
    admin.css
    student.css
  js/
    admin.js
    import-tools.js
    student.js
    content.js
    demo-data.js
    config.js
supabase/
  schema.sql
  update-v1.3.sql
  config.toml
  functions/
    admin-dashboard/
    admin-codes/
    admin-import/
    redeem-code/
    start-diagnostic/
    submit-diagnostic/
    _shared/
```

---

# Observação sobre Excel

O painel usa o script oficial do SheetJS no navegador para ler XLSX/XLS/CSV e gerar modelos. Por isso, a tela administrativa precisa de internet para carregar esse componente externo, salvo se futuramente o arquivo `xlsx.full.min.js` for hospedado localmente junto ao projeto.

O app do estudante continua independente desse recurso.
