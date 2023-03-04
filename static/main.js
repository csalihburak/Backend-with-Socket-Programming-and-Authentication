<script>
  const socket = io();

  const chatBox = document.getElementById('chat-box');
  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('message-input');

  messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value;
    socket.emit('chat message', message);
    messageInput.value = '';
  });

  socket.on('chat message', (msg) => {
    const messageElement = document.createElement('div');
    messageElement.innerText = msg;
    chatBox.appendChild(messageElement);
  });
</script>