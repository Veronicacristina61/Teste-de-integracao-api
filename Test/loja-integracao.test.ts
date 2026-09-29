// Traz do Vitest as ferramentas para criar o teste e fazer as conferências
import { test, expect } from "vitest";

// Endereço da API que vamos testar
const loja = "https://serverest.dev";


// 
// TESTE ORIGINAL + DEGRAU 1
// 
// Cenário: colocar produto no carrinho diminui o estoque (agora com 3 unidades)
// Partes da API: usuários (POST /usuarios), login (POST /login),
//   produtos (POST /produtos e GET /produtos/{id}), carrinhos (POST /carrinhos)
// O que confere no final: o estoque do produto caiu de 10 para 7

// Cria o teste: o texto é o nome dele, e o async permite usar await dentro
test("colocar um produto no carrinho diminui o estoque do produto", async () => {

  // Degrau 1: a quantidade agora é uma constante, para a conferência final
  // poder usar o mesmo valor (assim os dois nunca ficam diferentes)
  const quantidadeNoCarrinho = 3;

  // PASSO 1: criar uma conta

  // Gera um email diferente a cada execução, porque a API não aceita email repetido
  const email = `teste${Date.now()}@teste.com`;

  // Senha guardada numa constante para o cadastro e o login usarem a mesma
  const senha = "1234";

  // Envia o pedido de cadastro e espera a resposta
  const cadastro = await fetch(`${loja}/usuarios`, {
    method: "POST", // POST = criar algo novo
    headers: { "Content-Type": "application/json" }, // avisa que estamos mandando JSON
    body: JSON.stringify({ // transforma os dados em texto JSON
      nome: "Teste",
      email: email,
      password: senha,
      administrador: "true", // administrador pode cadastrar produtos
    }),
  });

  // Confere se o usuário foi criado (201 = criado com sucesso)
  expect(cadastro.status).toBe(201);


  // PASSO 2: fazer login e guardar o token

  // Envia email e senha para fazer login
  const login = await fetch(`${loja}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email,
      password: senha,
    }),
  });

  // Confere se o login deu certo (200 = sucesso)
  expect(login.status).toBe(200);

  // Lê a resposta e diz ao TypeScript que ela tem um campo authorization (texto)
  const dadosLogin = (await login.json()) as { authorization: string };

  // Guarda o token, que é o "crachá" para os próximos pedidos
  const token = dadosLogin.authorization;


  // PASSO 3: cadastrar um produto com 10 unidades

  // Envia o pedido de cadastro do produto, mostrando o token
  const produto = await fetch(`${loja}/produtos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({
      nome: `Produto ${Date.now()}`, // nome diferente a cada execução
      preco: 100,
      descricao: "Produto de teste",
      quantidade: 10, // estoque inicial
    }),
  });

  // Confere se o produto foi criado
  expect(produto.status).toBe(201);

  // Lê a resposta e diz ao TypeScript que ela tem um campo _id (texto)
  const dadosProduto = (await produto.json()) as { _id: string };
  const idProduto = dadosProduto._id;


  // PASSO 4: colocar 3 unidades no carrinho

  // Envia o pedido de criação do carrinho com o produto
  const carrinho = await fetch(`${loja}/carrinhos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({
      produtos: [{ idProduto: idProduto, quantidade: quantidadeNoCarrinho }], // lista de produtos do carrinho
    }),
  });

  // Confere se o carrinho foi criado
  expect(carrinho.status).toBe(201);


  // PASSO 5: olhar o produto e conferir o estoque

  // Consulta o produto pelo id (sem method = GET, só consultar)
  const consulta = await fetch(`${loja}/produtos/${idProduto}`);

  // Confere se a consulta deu certo
  expect(consulta.status).toBe(200);

  // Lê a resposta e diz ao TypeScript que ela tem um campo quantidade (número)
  const produtoAtualizado = (await consulta.json()) as { quantidade: number };

  // A conferência principal: era 10, colocamos 3 no carrinho, tem que ser 7
  expect(produtoAtualizado.quantidade).toBe(10 - quantidadeNoCarrinho);

}, 15000); // o teste pode levar até 15 segundos


// 
// FUNÇÃO AUXILIAR
//

// Faz os passos 1 a 4 do teste original (conta, login, produto com 10 unidades
// e carrinho) e devolve o que os próximos passos precisam: o token e o id do produto.
// Cada teste chama esta função e recebe o seu próprio usuário, produto e carrinho.
// Isso é necessário porque a ServeRest só aceita um carrinho por usuário e porque
// variáveis criadas dentro de um teste não existem dentro de outro.
async function prepararCarrinho(quantidadeNoCarrinho: number) {
  const email = `teste${Date.now()}${Math.floor(Math.random() * 1000)}@teste.com`;
  const senha = "1234";

  const cadastro = await fetch(`${loja}/usuarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: "Teste", email, password: senha, administrador: "true" }),
  });
  expect(cadastro.status).toBe(201);

  const login = await fetch(`${loja}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: senha }),
  });
  expect(login.status).toBe(200);
  const token = ((await login.json()) as { authorization: string }).authorization;

  const produto = await fetch(`${loja}/produtos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({
      nome: `Produto ${Date.now()}${Math.floor(Math.random() * 1000)}`,
      preco: 100,
      descricao: "Produto de teste",
      quantidade: 10,
    }),
  });
  expect(produto.status).toBe(201);
  const idProduto = ((await produto.json()) as { _id: string })._id;

  const carrinho = await fetch(`${loja}/carrinhos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ produtos: [{ idProduto, quantidade: quantidadeNoCarrinho }] }),
  });
  expect(carrinho.status).toBe(201);

  return { token, idProduto };
}

// Consulta o estoque atual de um produto
async function consultarEstoque(idProduto: string) {
  const consulta = await fetch(`${loja}/produtos/${idProduto}`);
  expect(consulta.status).toBe(200);
  return ((await consulta.json()) as { quantidade: number }).quantidade;
}


// 
// DEGRAU 2
// 

// Cenário: cancelar a compra devolve o estoque do produto
// Partes da API: usuários, login, produtos (cadastrar e consultar),
//   carrinhos (POST /carrinhos e DELETE /carrinhos/cancelar-compra)
// O que confere no final: o cancelamento responde 200 e o estoque volta de 7 para 10

test("cancelar a compra devolve o estoque do produto", async () => {
  // Passos 1 a 4: deixa um carrinho com 3 unidades pronto
  const { token, idProduto } = await prepararCarrinho(3);

  // Confere que o carrinho realmente tirou 3 do estoque (10 - 3 = 7).
  // Sem isso, não saberíamos se o estoque "voltou" ou se nunca tinha saído.
  expect(await consultarEstoque(idProduto)).toBe(7);

  // Cancela a compra: DELETE = apagar. O token diz de quem é o carrinho a cancelar
  const cancelamento = await fetch(`${loja}/carrinhos/cancelar-compra`, {
    method: "DELETE",
    headers: { Authorization: token },
  });
  expect(cancelamento.status).toBe(200);

  // A conferência principal: o estoque tem que voltar para 10
  expect(await consultarEstoque(idProduto)).toBe(10);
}, 15000);


// 
// DESAFIO
// 
// Cenário: a API recusa apagar um produto que está dentro de um carrinho
// Partes da API: usuários, login, produtos (cadastrar, apagar e consultar),
//   carrinhos (POST /carrinhos e DELETE /carrinhos/cancelar-compra para limpar)
// O que confere no final: DELETE /produtos/{id} responde 400 (recusado) e o produto
//   continua existindo, com o estoque de 7 que o carrinho deixou

test("não deixa apagar um produto que está dentro de um carrinho", async () => {
  // Passos 1 a 4: deixa um carrinho com 3 unidades pronto
  const { token, idProduto } = await prepararCarrinho(3);

  // Tenta apagar o produto usando o token de administrador.
  // Usamos o token de admin de propósito: com um usuário comum a API responderia 403
  // (sem permissão), e o teste passaria pelo motivo errado.
  const apagar = await fetch(`${loja}/produtos/${idProduto}`, {
    method: "DELETE",
    headers: { Authorization: token },
  });

  // Aqui o teste passa justamente porque a API recusou (400 = pedido não permitido)
  expect(apagar.status).toBe(400);

  // Prova de que nada foi apagado: o produto ainda existe e o estoque está como o carrinho deixou
  expect(await consultarEstoque(idProduto)).toBe(7);

  // Limpeza: cancela a compra para não deixar carrinho sobrando
  const cancelamento = await fetch(`${loja}/carrinhos/cancelar-compra`, {
    method: "DELETE",
    headers: { Authorization: token },
  });
  expect(cancelamento.status).toBe(200);
}, 15000);
