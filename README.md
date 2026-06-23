# Tinpay - Controle Financeiro

App de controle financeiro pessoal com suporte a múltiplos bancos de dados.

## Configuração do Firebase

1. **Criar projeto no Firebase Console**
   - Acesse https://console.firebase.google.com/
   - Clique em "Adicionar projeto"
   - Dê um nome ao projeto (ex: "tinpay-financeiro")
   - Desative o Google Analytics (não é necessário)

2. **Configurar Realtime Database**
   - No menu lateral, clique em "Realtime Database"
   - Clique em "Criar banco de dados"
   - Selecione "Iniciar no modo de teste" (para desenvolvimento)
   - Depois, mude as regras para:
   ```
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```

3. **Obter credenciais**
   - Vá em Configurações do projeto (engrenagem)
   - Role até "Seus apps"
   - Clique no ícone </> (Web)
   - Copie o objeto `firebaseConfig`

4. **Atualizar firebase-config.js**
   - Abra o arquivo `firebase-config.js`
   - Substitua os placeholders com suas credenciais:
   ```javascript
   const firebaseConfig = {
     apiKey: "SUA_API_KEY",
     authDomain: "SEU_PROJETO.firebaseapp.com",
     databaseURL: "https://SEU_PROJETO-default-rtdb.firebaseio.com",
     projectId: "SEU_PROJETO",
     storageBucket: "SEU_PROJETO.appspot.com",
     messagingSenderId: "SEU_SENDER_ID",
     appId: "SEU_APP_ID"
   };
   ```

## Hospedar no GitHub Pages

1. **Criar repositório no GitHub**
   - Acesse https://github.com/new
   - Crie um repositório público (ex: "tinpay")
   - Não inicialize com README

2. **Fazer upload dos arquivos**
   - No seu computador, navegue até a pasta do projeto
   - Abra o terminal na pasta
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/tinpay.git
   git push -u origin main
   ```

3. **Ativar GitHub Pages**
   - No repositório do GitHub, vá em Settings
   - Clique em "Pages" no menu lateral
   - Em "Source", selecione "Deploy from a branch"
   - Branch: "main", pasta: "/ (root)"
   - Clique em "Save"

4. **Acessar o app**
   - Aguarde alguns minutos
   - Acesse https://SEU_USUARIO.github.io/tinpay/

## Funcionalidades

- **Múltiplos bancos**: "fantin" e "maria" com dados separados
- **Importação CSV**: Suporta Nubank e outros bancos
- **Categorização automática**: Sugere categorias baseadas na descrição
- **Dashboard**: Visualização de gastos por mês
- **Sincronização na nuvem**: Dados salvos no Firebase, acessíveis de qualquer dispositivo

## Estrutura do projeto

```
pay/
├── index.html           # Página principal
├── firebase-config.js   # Configuração do Firebase
├── storage.js          # Camada de armazenamento
├── engine.js           # Lógica de analytics
├── dashboard.js        # Componente dashboard
├── transactions.js     # Componente gastos
├── import.js           # Componente importação
├── analytics.js        # Componente análise
├── settings.js         # Componente configurações
├── schedule.js         # Componente programação
├── categories.js       # Categorias
├── charts.js           # Gráficos
├── styles.css          # Estilos
└── app.js              # Controller principal
```
