const fs = require("fs");
const WPP = require("@wppconnect-team/wppconnect");

const DATA_DIRECTORY = "contactMessages"; // Diretório para armazenar os dados das mensagens por contato

let clientInstance; // Variável para armazenar a instância do cliente do WhatsApp

WPP.create({
  session: "sessionName",
  catchQR: (base64Qr, asciiQR) => {
    console.log(asciiQR); // Opcional para registrar o QR no terminal
    const matches = base64Qr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("Invalid input string");
    }
    const response = {
      type: matches[1],
      data: Buffer.from(matches[2], "base64"),
    };
    fs.writeFile("out.png", response.data, "binary", (err) => {
      if (err) {
        console.error(err);
      }
    });
  },
  logQR: false,
})
  .then((client) => {
    clientInstance = client; // Armazena a instância do cliente
    start(client);
  })
  .catch((error) => console.log(error));

function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isFirstMessageOfDay(contactId) {
  try {
    const contactMessagesDir = `${DATA_DIRECTORY}/${contactId}`;
    if (!fs.existsSync(contactMessagesDir)) {
      // Se o diretório do contato não existir, é a primeira mensagem do dia para esse contato
      fs.mkdirSync(contactMessagesDir, { recursive: true });
      return true;
    }

    const lastMessageDate = fs
      .readFileSync(`${contactMessagesDir}/lastMessageDate.txt`, "utf8")
      .trim();
    return lastMessageDate !== getCurrentDate();
  } catch (error) {
    console.error(
      "Erro ao verificar se é a primeira mensagem do dia para o contato:",
      error
    );
    return false;
  }
}

async function start(client) {
  client.onMessage(async (message) => {
    try {
      // Se a mensagem for de um grupo ou se for para o status, ignora
      if (message.isGroupMsg || message.isStatusMsg) {
        console.log(
          "Mensagem recebida de um grupo ou para o status. Ignorando..."
        );
        return;
      }

      const contactId = message.from; // Assume-se que o ID do contato seja o mesmo que o número do telefone
      // Verifica se é a primeira mensagem do dia para o contato
      if (isFirstMessageOfDay(contactId)) {
        await client.reply(
          message.from,
          `Bom dia! Gostaria de qual tipo de serviço?`
        );
        await client.sendText(
          message.from,
          `1- Cardápio \n2- Horário de funcionamento\n3- Promoções`
        );
        // Atualiza o arquivo de dados com a nova data
        const contactMessagesDir = `${DATA_DIRECTORY}/${contactId}`;
        fs.writeFileSync(
          `${contactMessagesDir}/lastMessageDate.txt`,
          getCurrentDate()
        );
        console.log("Mensagem de bom dia enviada.");
      }

      if (message.body === "1") {
        await client.sendText(
          message.from,
          `Cardápio: \n1. Banana frita \n2. Acelora \n3. Cavalos`
        );
      }
      if (message.body === "2") {
        await client.sendText(
          message.from,
          `Horário de funcionamento: \n00:00 às 23:59, segunda a segunda, 24/7`
        );
      }
      if (message.body === "3") {
        await client.sendText(message.from, `Promoções: \nRato frito, R$0,99`);
      }
    } catch (error) {
      console.error("Erro ao processar a mensagem:", error);
    }
    console.log(message.body);
  });
}
