# pr-bingopalavras

Jogo de bingo que funciona sem internet usando o Wi-Fi local. Um aparelho hospeda a sala; os outros entram pelo QR ou pelo código.

## Iniciar

1. Conecte todos os aparelhos ao mesmo Wi-Fi.
2. No computador que será o anfitrião (conectado a esse Wi-Fi), abra um terminal nesta pasta e execute `npm start`.
3. Abra no navegador o endereço local exibido no terminal, como `http://192.168.1.20:8000`.
4. Crie a sala e mostre o QR. Os convidados leem o QR, informam seus nomes e entram.
5. O anfitrião adiciona as palavras. Elas aparecem nas cartelas de todos os jogadores.

O servidor usa apenas módulos que já vêm com Node.js. As salas existem enquanto o processo `npm start` estiver rodando.

### Importante: Codespaces

O endereço encaminhado do Codespaces serve para pré-visualização e não é o endereço do Wi-Fi local. Os outros aparelhos não conseguirão acessar a sala por esse link. Para jogar na rede local, execute `npm start` em um computador conectado ao mesmo Wi-Fi e abra o endereço IP local impresso no terminal. Se o sistema pedir, permita que o Node.js aceite conexões na rede privada.
