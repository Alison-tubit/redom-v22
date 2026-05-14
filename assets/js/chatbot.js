/* =========================================================
   CHATBOT POPUP SYSTEM
   - Opens from floating message icon
   - Works independently from Firebase details loading
========================================================= */
(function () {
  const chatFab = document.querySelector('.chat-fab');
  const chatbotBox = document.getElementById('chatbotBox');
  const chatbotBody = document.getElementById('chatbotBody');
  const chatbotForm = document.getElementById('chatbotForm');
  const chatbotInput = document.getElementById('chatbotInput');

  if (!chatFab || !chatbotBox || !chatbotBody) return;

  chatFab.addEventListener('click', function (e) {
    e.preventDefault();
    chatbotBox.classList.toggle('show');
  });

  document.addEventListener('click', function (e) {
    const clickedInsideChat = chatbotBox.contains(e.target);
    const clickedFab = chatFab.contains(e.target);

    if (!clickedInsideChat && !clickedFab && chatbotBox.classList.contains('show')) {
      chatbotBox.classList.remove('show');
    }
  });

  function scrollChatBottom() {
    chatbotBody.scrollTop = chatbotBody.scrollHeight;
  }

  function addUserMessage(text) {
    const row = document.createElement('div');
    row.className = 'user-row';
    row.innerHTML = `
      <div class="user-message">${text}</div>
      <div class="user-avatar"><i class="fa-solid fa-user"></i></div>
    `;
    chatbotBody.appendChild(row);
    scrollChatBottom();
  }

  function addBotMessage(text) {
    const row = document.createElement('div');
    row.className = 'bot-row';
    row.innerHTML = `
      <div class="bot-avatar"><i class="fa-solid fa-robot"></i></div>
      <div class="bot-message">${text || ''}</div>
    `;
    chatbotBody.appendChild(row);
    scrollChatBottom();
  }

  function addLoadingOnly() {
    const row = document.createElement('div');
    row.className = 'loading-row';
    row.innerHTML = `
      <div class="bot-avatar"><i class="fa-solid fa-robot"></i></div>
      <div class="chat-loader"></div>
    `;
    chatbotBody.appendChild(row);
    scrollChatBottom();
  }

  document.querySelectorAll('.chat-option').forEach(option => {
    option.addEventListener('click', function () {
      const question = this.textContent.trim();
      addUserMessage(question);

      if (this.dataset.contact === 'true') {
        const btn = document.createElement('button');
        btn.className = 'contact-btn';
        btn.innerHTML = `<i class="fa-solid fa-circle-question"></i> যোগাযোগ পেজে যান`;
        chatbotBody.appendChild(btn);
        scrollChatBottom();
        return;
      }

      addBotMessage(this.dataset.reply);
    });
  });

  if (chatbotForm && chatbotInput) {
    chatbotForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const text = chatbotInput.value.trim();
      if (!text) return;

      addUserMessage(text);
      chatbotInput.value = '';
      addLoadingOnly();
    });
  }
})();
