// ========== 情侣空间 ==========
const COUPLE_SPACE_STORAGE_KEY = 'coupleSpaces';

function getCoupleSpaces() {
  try { return JSON.parse(localStorage.getItem(COUPLE_SPACE_STORAGE_KEY)) || []; }
  catch(e) { return []; }
}
function saveCoupleSpaces(spaces) {
  localStorage.setItem(COUPLE_SPACE_STORAGE_KEY, JSON.stringify(spaces));
}
function getLastCoupleSpace() {
  const last = localStorage.getItem('coupleSpaceLastId');
  const spaces = getCoupleSpaces();
  if (last && spaces.find(s => s.charId === last)) return last;
  return spaces.length > 0 ? spaces[0].charId : null;
}

function openCoupleSpace() {
  const lastId = getLastCoupleSpace();
  if (lastId) {
    enterCoupleSpace(lastId);
  } else {
    showCoupleSpaceSelect('invite');
  }
}

function showCoupleSpaceSelect(mode) {
  const container = document.getElementById('couple-space-select-content');
  container.innerHTML = '';
  const spaces = getCoupleSpaces();
  const characters = Object.values(state.chats).filter(c => !c.isGroup);

  if (mode === 'list') {
    // 已有空间列表
    if (spaces.length > 0) {
      spaces.forEach(sp => {
        const chat = state.chats[sp.charId];
        if (!chat) return;
        const item = document.createElement('div');
        item.className = 'character-select-item';
        item.innerHTML = `
          <img src="${chat.settings.aiAvatar || defaultAvatar}" class="avatar">
          <span class="name">${chat.name}</span>
          <span style="margin-left:auto;font-size:12px;color:#999;">已绑定</span>`;
        item.addEventListener('click', () => enterCoupleSpace(sp.charId));
        container.appendChild(item);
      });
    }
    // 新建入口
    const addBtn = document.createElement('div');
    addBtn.className = 'character-select-item';
    addBtn.style.cssText = 'justify-content:center;color:var(--text-secondary);';
    addBtn.innerHTML = `<span style="font-size:22px;margin-right:8px;">+</span><span class="name" style="color:inherit;">开启新空间</span>`;
    addBtn.addEventListener('click', () => showCoupleSpaceSelect('invite'));
    container.appendChild(addBtn);
  } else {
    // 邀请模式 - 选择角色
    const bound = new Set(spaces.map(s => s.charId));
    const available = characters.filter(c => !bound.has(c.id));
    if (available.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:50px 0;">没有可邀请的角色了~</p>';
      if (spaces.length > 0) {
        const backBtn = document.createElement('div');
        backBtn.className = 'character-select-item';
        backBtn.style.cssText = 'justify-content:center;color:var(--text-secondary);margin-top:10px;';
        backBtn.innerHTML = '<span class="name" style="color:inherit;">返回空间列表</span>';
        backBtn.addEventListener('click', () => showCoupleSpaceSelect('list'));
        container.appendChild(backBtn);
      }
      return;
    }
    // 提示文字已移除，直接展示角色列表

    available.forEach(char => {
      const item = document.createElement('div');
      item.className = 'character-select-item';
      item.innerHTML = `
        <img src="${char.settings.aiAvatar || defaultAvatar}" class="avatar">
        <span class="name">${char.name}</span>`;
      item.addEventListener('click', () => inviteToCoupleSpace(char));
      container.appendChild(item);
    });

    if (spaces.length > 0) {
      const backBtn = document.createElement('div');
      backBtn.className = 'character-select-item';
      backBtn.style.cssText = 'justify-content:center;color:var(--text-secondary);margin-top:10px;';
      backBtn.innerHTML = '<span class="name" style="color:inherit;">返回空间列表</span>';
      backBtn.addEventListener('click', () => showCoupleSpaceSelect('list'));
      container.appendChild(backBtn);
    }
  }
  showScreen('couple-space-select-screen');
}

function inviteToCoupleSpace(char) {
  // 不再直接创建空间，而是发送邀请卡片到聊天中
  const chat = state.chats[char.id];
  if (!chat) return;

  const myNickname = chat.settings.myNickname || '我';

  const inviteMsg = {
    role: 'user',
    type: 'couple_invite',
    status: 'pending',
    senderName: myNickname,
    receiverName: chat.name,
    timestamp: Date.now()
  };
  chat.history.push(inviteMsg);
  db.chats.put(chat);

  // 关闭选择界面，跳转到聊天界面
  state.activeChatId = char.id;
  showScreen('chat-interface-screen');
  renderChatInterface(char.id);
  renderChatList();
}

// 当角色接受邀请后，真正创建情侣空间
function confirmCoupleSpace(charId) {
  const spaces = getCoupleSpaces();
  if (spaces.find(s => s.charId === charId)) return; // 已存在
  const chat = state.chats[charId];
  spaces.push({
    charId: charId,
    charName: chat ? chat.name : '',
    createdAt: Date.now()
  });
  saveCoupleSpaces(spaces);
}

function enterCoupleSpace(charId) {
  localStorage.setItem('coupleSpaceLastId', charId);
  const chat = state.chats[charId];
  const charName = chat ? chat.name : '';
  const charAvatar = chat ? (chat.settings.aiAvatar || defaultAvatar) : '';
  const userNickname = chat ? (chat.settings.myNickname || '我') : '我';
  const userAvatar = chat ? (chat.settings.myAvatar || state.qzoneSettings.avatar || defaultAvatar) : defaultAvatar;
  const iframe = document.getElementById('couple-space-iframe');
  iframe.src = '330--main/index.html';
  iframe.onload = function() {
    const spaces = getCoupleSpaces();
    const space = spaces.find(s => s.charId === charId);
    iframe.contentWindow.postMessage({
      type: 'coupleSpaceInit',
      charId: charId,
      charName: charName,
      charAvatar: charAvatar,
      userName: userNickname,
      userAvatar: userAvatar,
      createdAt: space ? space.createdAt : Date.now()
    }, '*');
  };
  showScreen('couple-space-screen');
}

function closeCoupleSpace() {
  showScreen('home-screen');
  document.getElementById('couple-space-iframe').src = '';
}

window.addEventListener('message', function(e) {
  if (e.data === 'closeCoupleSpace') closeCoupleSpace();
  if (e.data === 'coupleSpaceSwitchPartner') showCoupleSpaceSelect('list');

  // --- Diary AI requests ---
  if (e.data && e.data.type === 'coupleSpaceDiaryAiRequest') {
    handleCoupleSpaceDiaryAiRequest(e.data);
  }
  if (e.data && e.data.type === 'coupleSpaceDiaryCommentRequest') {
    handleCoupleSpaceDiaryCommentRequest(e.data);
  }
  if (e.data && e.data.type === 'coupleSpaceDiarySettingsChanged') {
    handleCoupleSpaceDiarySettingsChanged(e.data);
  }
  if (e.data && e.data.type === 'coupleSpaceDiarySummaryRequest') {
    handleCoupleSpaceDiarySummaryRequest(e.data);
  }

  // --- Album requests ---
  if (e.data && e.data.type === 'coupleSpaceAlbumAiRequest') {
    handleCoupleSpaceAlbumAiRequest(e.data);
  }
  if (e.data && e.data.type === 'coupleSpaceAlbumSettingsChanged') {
    handleCoupleSpaceAlbumSettingsChanged(e.data);
  }
  if (e.data && e.data.type === 'coupleSpaceAlbumRecognize') {
    handleCoupleSpaceAlbumRecognize(e.data);
  }

  // --- Album comment requests ---
  if (e.data && e.data.type === 'coupleSpaceAlbumCommentRequest') {
    handleCoupleSpaceAlbumCommentRequest(e.data);
  }

  // --- Anniversary requests ---
  if (e.data && e.data.type === 'coupleSpaceAnnivHeartRequest') {
    handleCoupleSpaceAnnivHeartRequest(e.data);
  }
  if (e.data && e.data.type === 'coupleSpaceAnnivChanged') {
    handleCoupleSpaceAnnivChanged(e.data);
  }
  if (e.data && e.data.type === 'coupleSpaceAnnivCreateRequest') {
    handleCoupleSpaceAnnivCreateRequest(e.data);
  }
  if (e.data && e.data.type === 'coupleSpaceAnnivSettingsChanged') {
    handleCoupleSpaceAnnivSettingsChanged(e.data);
  }

  // --- Screenshot requests ---
  if (e.data && e.data.type === 'coupleSpaceScreenshotRequest') {
    handleCoupleSpaceScreenshotRequest(e.data);
  }
});

// ========== Diary AI Integration ==========

async function handleCoupleSpaceDiaryAiRequest(data) {
  const iframe = document.getElementById('couple-space-iframe');
  if (!iframe || !iframe.contentWindow) return;
  const chat = state.chats[data.charId];
  if (!chat) {
    iframe.contentWindow.postMessage({ type: 'coupleSpaceDiaryAiResult', error: true }, '*');
    return;
  }
  // 一天一篇限制
  try {
    const diaries = JSON.parse(localStorage.getItem('coupleDiaries_' + data.charId) || '[]');
    const todayStr = new Date().toISOString().split('T')[0];
    const wroteToday = diaries.some(d => d.author === 'char' && new Date(d.timestamp).toISOString().split('T')[0] === todayStr);
    if (wroteToday) {
      iframe.contentWindow.postMessage({ type: 'coupleSpaceDiaryAiResult', error: true, reason: 'already_wrote_today' }, '*');
      return;
    }
  } catch(e) {}
  try {
    const result = await generateCoupleSpaceDiaryAi(chat, data);
    iframe.contentWindow.postMessage({
      type: 'coupleSpaceDiaryAiResult',
      title: result.title,
      content: result.content,
      mood: result.mood
    }, '*');
  } catch(err) {
    console.error('Diary AI error:', err);
    iframe.contentWindow.postMessage({ type: 'coupleSpaceDiaryAiResult', error: true }, '*');
  }
}

async function handleCoupleSpaceDiaryCommentRequest(data) {
  const iframe = document.getElementById('couple-space-iframe');
  if (!iframe || !iframe.contentWindow) return;
  const chat = state.chats[data.charId];
  if (!chat) {
    iframe.contentWindow.postMessage({ type: 'coupleSpaceDiaryCommentResult', diaryId: data.diaryId, error: true }, '*');
    return;
  }
  try {
    const comment = await generateCoupleSpaceDiaryComment(chat, data);
    iframe.contentWindow.postMessage({
      type: 'coupleSpaceDiaryCommentResult',
      diaryId: data.diaryId,
      comment: comment
    }, '*');
  } catch(err) {
    console.error('Diary comment AI error:', err);
    iframe.contentWindow.postMessage({ type: 'coupleSpaceDiaryCommentResult', diaryId: data.diaryId, error: true }, '*');
  }
}

function handleCoupleSpaceDiarySettingsChanged(data) {
  // Store settings in parent for auto-trigger scheduling
  localStorage.setItem('coupleDiarySettings_' + data.charId, JSON.stringify(data.settings));
}

async function handleCoupleSpaceDiarySummaryRequest(data) {
  const iframe = document.getElementById('couple-space-iframe');
  if (!iframe || !iframe.contentWindow) return;
  try {
    const { proxyUrl, apiKey, model } = state.apiConfig;
    if (!proxyUrl || !apiKey || !model) throw new Error('API未配置');

    const authorName = data.diaryAuthor === 'char' ? data.charName : data.userName;
    let commentsText = '';
    if (data.diaryComments && data.diaryComments.length > 0) {
      commentsText = '\n评语：\n' + data.diaryComments.map(c => {
        const cName = c.author === 'char' ? data.charName : data.userName;
        return cName + ': ' + c.content;
      }).join('\n');
    }

    const prompt = `请为以下日记生成一段简洁的摘要（50-100字），概括日记的核心内容、情感和关键事件。直接返回摘要文本，不要任何格式包裹。

日记标题: ${data.diaryTitle}
作者: ${authorName}
心情: ${data.diaryMood || '未标注'}
正文:
${data.diaryContent}
${commentsText}`;

    const messages = [{ role: 'user', content: prompt }];
    const isGemini = proxyUrl === GEMINI_API_URL;
    let response;
    if (isGemini) {
      const geminiConfig = toGeminiRequestData(model, apiKey, prompt, messages);
      response = await fetch(geminiConfig.url, geminiConfig.data);
    } else {
      response = await fetch(`${proxyUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: prompt }, ...messages], temperature: 0.5 })
      });
    }
    if (!response.ok) throw new Error('API请求失败');
    const respData = await response.json();
    const summary = getGeminiResponseText(respData).replace(/^["']|["']$/g, '').trim();
    iframe.contentWindow.postMessage({ type: 'coupleSpaceDiarySummaryResult', diaryId: data.diaryId, summary }, '*');
  } catch(err) {
    console.error('Diary summary error:', err);
    iframe.contentWindow.postMessage({ type: 'coupleSpaceDiarySummaryResult', diaryId: data.diaryId, error: true }, '*');
  }
}

function buildDiaryAiContext(chat) {
  const myNickname = chat.settings.myNickname || '我';
  const charName = chat.name;

  // Long-term memory
  let longTermMemory = '';
  if (chat.longTermMemory && chat.longTermMemory.length > 0) {
    longTermMemory = chat.longTermMemory.map(m => '- ' + m.content).join('\n');
  }

  // Structured memory
  let structuredMemory = '';
  if (typeof structuredMemoryManager !== 'undefined') {
    try { structuredMemory = structuredMemoryManager.serializeForPrompt(chat); } catch(e) {}
  }

  // Short-term memory (recent chat)
  const maxMemory = parseInt(chat.settings.maxMemory) || 10;
  const recentHistory = chat.history.filter(m => !m.isExcluded && !m.isHidden).slice(-maxMemory);
  let shortTermMemory = '';
  if (recentHistory.length > 0) {
    shortTermMemory = recentHistory.map(msg => {
      const sender = msg.role === 'user' ? myNickname : charName;
      let content = '';
      if (msg.type === 'voice_message') content = '[语音] ' + msg.content;
      else if (msg.type === 'ai_image' || msg.type === 'user_photo') content = '[图片] ' + msg.content;
      else if (msg.type === 'sticker') content = '[表情: ' + (msg.meaning || '') + ']';
      else content = String(msg.content || '').substring(0, 150);
      return sender + ': ' + content;
    }).join('\n');
  }

  // Linked memories
  let linkedMemory = '';
  const memoryCount = chat.settings.linkedMemoryCount || 10;
  if (chat.settings.linkedMemoryChatIds && chat.settings.linkedMemoryChatIds.length > 0) {
    const idsToMount = chat.settings.linkedMemoryChatIds.filter(id => id !== chat.id);
    idsToMount.forEach(id => {
      const linkedChat = state.chats[id];
      if (!linkedChat) return;
      const recent = linkedChat.history.filter(m => !m.isHidden).slice(-memoryCount);
      if (recent.length > 0) {
        linkedMemory += '\n来自"' + linkedChat.name + '"的记忆:\n';
        recent.forEach(msg => {
          const sender = msg.role === 'user' ? (linkedChat.settings.myNickname || '我') : linkedChat.name;
          linkedMemory += sender + ': ' + String(msg.content || '').substring(0, 100) + '\n';
        });
      }
    });
  }

  // World book
  let worldBook = '';
  let allWorldBookIds = [...(chat.settings.linkedWorldBookIds || [])];
  if (typeof state !== 'undefined' && state.worldBooks) {
    state.worldBooks.forEach(wb => {
      if (wb.isGlobal && !allWorldBookIds.includes(wb.id)) allWorldBookIds.push(wb.id);
    });
    allWorldBookIds.forEach(bookId => {
      const wb = state.worldBooks.find(w => w.id === bookId);
      if (!wb || !Array.isArray(wb.content)) return;
      wb.content.filter(e => e.enabled !== false).forEach(entry => {
        worldBook += entry.content + '\n';
      });
    });
  }

  // Time
  let currentTime = '';
  try {
    const tz = chat.settings.timeZone || 'Asia/Shanghai';
    currentTime = new Date().toLocaleString('zh-CN', { timeZone: tz, dateStyle: 'full', timeStyle: 'short' });
  } catch(e) {
    currentTime = new Date().toLocaleString('zh-CN');
  }

  // Weather
  let weatherInfo = '';
  // Weather is async, skip for simplicity; AI can infer from time

  // Anniversaries
  let anniversaryContext = '';
  try {
    const annivs = JSON.parse(localStorage.getItem('coupleAnniv_' + chat.id) || '[]');
    if (annivs.length > 0) {
      const now = new Date(); now.setHours(0,0,0,0);
      const todayItems = [];
      const upcomingItems = [];
      const allItems = [];

      annivs.forEach(a => {
        const d = new Date(a.date + 'T00:00:00');
        const thisYear = new Date(now.getFullYear(), d.getMonth(), d.getDate());
        const nextOcc = thisYear >= now ? thisYear : new Date(now.getFullYear() + 1, d.getMonth(), d.getDate());
        const daysUntil = Math.floor((nextOcc - now) / 86400000);
        const daysSince = Math.floor((now - d) / 86400000);
        const heartInfo = [];
        if (a.hearts && a.hearts.user) heartInfo.push(myNickname + '点了爱心');
        if (a.hearts && a.hearts.char) heartInfo.push(charName + '点了爱心');

        const entry = `"${a.title}" (${a.date}, ${a.reason || '无理由'})${heartInfo.length > 0 ? ' [' + heartInfo.join(', ') + ']' : ''}`;

        if (daysUntil === 0) todayItems.push(entry);
        else if (daysUntil <= 7) upcomingItems.push(`${entry} - 还有${daysUntil}天`);
        allItems.push(`- ${entry} (已${daysSince}天)`);
      });

      if (todayItems.length > 0) anniversaryContext += '🎉 今天是纪念日: ' + todayItems.join('; ') + '\n';
      if (upcomingItems.length > 0) anniversaryContext += '📅 即将到来: ' + upcomingItems.join('; ') + '\n';
      anniversaryContext += '所有纪念日:\n' + allItems.join('\n');
    }
  } catch(e) {}

  // Summary
  let summaryContext = '';
  if (typeof generateSummaryForTimeframe === 'function') {
    try {
      const s1 = generateSummaryForTimeframe(chat, 1, 'days');
      const s3 = generateSummaryForTimeframe(chat, 3, 'days');
      if (s1) summaryContext += s1;
      if (s3) summaryContext += s3;
    } catch(e) {}
  }

  return {
    aiPersona: chat.settings.aiPersona || '',
    myPersona: chat.settings.myPersona || '',
    myNickname,
    charName,
    longTermMemory,
    structuredMemory,
    shortTermMemory,
    linkedMemory,
    worldBook,
    currentTime,
    summaryContext,
    anniversaryContext
  };
}

async function generateCoupleSpaceDiaryAi(chat, data) {
  const { proxyUrl, apiKey, model } = state.apiConfig;
  if (!proxyUrl || !apiKey || !model) throw new Error('API未配置');

  const ctx = buildDiaryAiContext(chat);

  let recentDiariesText = '';
  if (data.recentDiaries && data.recentDiaries.length > 0) {
    recentDiariesText = data.recentDiaries.map(d =>
      '- [' + d.date + '] ' + d.author + '《' + d.title + '》: ' + d.content
    ).join('\n');
  }

  // 检查是否有自定义提示词
  let diarySettings = {};
  try { diarySettings = JSON.parse(localStorage.getItem('coupleDiarySettings_' + data.charId) || '{}'); } catch(e) {}

  let systemPrompt;
  if (diarySettings.enableCustomPrompt && diarySettings.customPrompt) {
    // 使用自定义提示词模板，替换变量
    systemPrompt = diarySettings.customPrompt
      .replace(/\{\{charName\}\}/g, ctx.charName)
      .replace(/\{\{myNickname\}\}/g, ctx.myNickname)
      .replace(/\{\{aiPersona\}\}/g, ctx.aiPersona || '')
      .replace(/\{\{myPersona\}\}/g, ctx.myPersona || '')
      .replace(/\{\{worldBook\}\}/g, ctx.worldBook ? '# 世界观\n' + ctx.worldBook : '')
      .replace(/\{\{structuredMemory\}\}/g, ctx.structuredMemory || '(暂无结构化记忆)')
      .replace(/\{\{longTermMemory\}\}/g, ctx.longTermMemory ? '# 长期记忆\n' + ctx.longTermMemory : '')
      .replace(/\{\{shortTermMemory\}\}/g, ctx.shortTermMemory ? '# 最近的对话\n' + ctx.shortTermMemory : '')
      .replace(/\{\{linkedMemory\}\}/g, ctx.linkedMemory ? '# 参考记忆\n' + ctx.linkedMemory : '')
      .replace(/\{\{summaryContext\}\}/g, ctx.summaryContext ? '# 对话总结\n' + ctx.summaryContext : '')
      .replace(/\{\{recentDiaries\}\}/g, recentDiariesText ? '# 最近的日记（避免重复话题）\n' + recentDiariesText : '')
      .replace(/\{\{currentTime\}\}/g, ctx.currentTime)
      .replace(/\{\{anniversaryContext\}\}/g, ctx.anniversaryContext ? '# 纪念日\n' + ctx.anniversaryContext : '');
  } else {
    systemPrompt = `# 你的任务
你是"${ctx.charName}"，现在要在情侣空间里写一篇日记。这篇日记是写给你自己的，但你的伴侣"${ctx.myNickname}"可以看到并写评语。

# 你的角色设定
${ctx.aiPersona}

# 你的伴侣
- 昵称: ${ctx.myNickname}
- 人设: ${ctx.myPersona}

${ctx.worldBook ? '# 世界观\n' + ctx.worldBook : ''}

# 你的记忆
${ctx.structuredMemory || '(暂无结构化记忆)'}

${ctx.longTermMemory ? '# 长期记忆\n' + ctx.longTermMemory : ''}

${ctx.shortTermMemory ? '# 最近的对话\n' + ctx.shortTermMemory : ''}

${ctx.linkedMemory ? '# 参考记忆\n' + ctx.linkedMemory : ''}

${ctx.summaryContext ? '# 对话总结\n' + ctx.summaryContext : ''}

${recentDiariesText ? '# 最近的日记（避免重复话题）\n' + recentDiariesText : ''}

${ctx.anniversaryContext ? '# 纪念日\n' + ctx.anniversaryContext : ''}

# 当前时间
${ctx.currentTime}

# 输出要求
请以JSON格式返回，不要输出任何其他内容：
{"title": "日记标题", "content": "日记正文", "mood": "心情ID"}

心情ID可选值: happy, calm, moved, miss, sad, angry, excited, tired（选一个最符合的）

# 写作要求
- 以第一人称写，像真人写日记一样自然
- 内容要基于你的记忆和最近发生的事
- 可以写对伴侣的感受、今天的心情、发生的事、未来的期待等
- 字数在100-400字之间
- 语气要符合你的角色设定
- 不要写成流水账，要有情感和细节
- 绝对不要提到你是AI`;
  }

  const messages = [{ role: 'user', content: '请写一篇日记。' }];

  const isGemini = proxyUrl === GEMINI_API_URL;
  let response;
  if (isGemini) {
    const geminiConfig = toGeminiRequestData(model, apiKey, systemPrompt, messages);
    response = await fetch(geminiConfig.url, geminiConfig.data);
  } else {
    response = await fetch(`${proxyUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: state.globalSettings.apiTemperature || 0.8
      })
    });
  }

  if (!response.ok) throw new Error('API请求失败: ' + response.status);
  const respData = await response.json();
  const raw = getGeminiResponseText(respData).replace(/^```json\s*/, '').replace(/```$/, '').trim();
  return JSON.parse(raw);
}

async function generateCoupleSpaceDiaryComment(chat, data) {
  const { proxyUrl, apiKey, model } = state.apiConfig;
  if (!proxyUrl || !apiKey || !model) throw new Error('API未配置');

  const ctx = buildDiaryAiContext(chat);

  let taskDesc = '';
  if (data.diaryAuthor === 'user') {
    taskDesc = `${ctx.myNickname}写了一篇日记，请你作为${ctx.charName}写一条评语。`;
  } else {
    taskDesc = `你（${ctx.charName}）之前写了一篇日记，${ctx.myNickname}给你写了评语："${data.userComment}"。请你回复这条评语。`;
  }

  const systemPrompt = `# 你的任务
${taskDesc}

# 你的角色设定
${ctx.aiPersona}

# 日记信息
- 标题: ${data.diaryTitle}
- 内容: ${data.diaryContent}
- 心情: ${data.diaryMood || '未标注'}
- 作者: ${data.diaryAuthor === 'user' ? ctx.myNickname : ctx.charName}

${ctx.structuredMemory ? '# 你的记忆\n' + ctx.structuredMemory : ''}
${ctx.longTermMemory ? '# 长期记忆\n' + ctx.longTermMemory : ''}

# 输出要求
直接返回评语文本，不要JSON格式，不要引号包裹。

# 写作要求
- 像真人写评论一样自然
- 字数在20-150字之间
- 语气符合你的角色设定
- 可以表达感受、回应日记内容、或者撒娇/关心
- 绝对不要提到你是AI`;

  const messages = [{ role: 'user', content: '请写评语。' }];

  const isGemini = proxyUrl === GEMINI_API_URL;
  let response;
  if (isGemini) {
    const geminiConfig = toGeminiRequestData(model, apiKey, systemPrompt, messages);
    response = await fetch(geminiConfig.url, geminiConfig.data);
  } else {
    response = await fetch(`${proxyUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: state.globalSettings.apiTemperature || 0.8
      })
    });
  }

  if (!response.ok) throw new Error('API请求失败: ' + response.status);
  const respData = await response.json();
  return getGeminiResponseText(respData).replace(/^["']|["']$/g, '').trim();
}

// ========== Auto Diary Scheduler ==========
let coupleSpaceDiaryTimers = {};

function setupCoupleSpaceDiaryAutoTimer() {
  // Clear existing timers
  Object.values(coupleSpaceDiaryTimers).forEach(t => clearInterval(t));
  coupleSpaceDiaryTimers = {};

  const spaces = getCoupleSpaces();
  spaces.forEach(sp => {
    try {
      const settings = JSON.parse(localStorage.getItem('coupleDiarySettings_' + sp.charId)) || {};
      if (settings.autoEnabled && settings.autoTime) {
        scheduleDiaryAutoWrite(sp.charId, settings.autoTime);
      }
    } catch(e) {}
  });
}

function scheduleDiaryAutoWrite(charId, timeStr) {
  // Check every minute if it's time to write
  coupleSpaceDiaryTimers[charId] = setInterval(() => {
    const now = new Date();
    const [h, m] = timeStr.split(':').map(Number);
    if (now.getHours() === h && now.getMinutes() === m) {
      // Check if already wrote today
      const todayKey = 'coupleDiaryAutoLast_' + charId;
      const lastDate = localStorage.getItem(todayKey);
      const todayStr = now.toISOString().split('T')[0];
      if (lastDate === todayStr) return;
      localStorage.setItem(todayKey, todayStr);

      // Trigger auto diary write
      triggerAutoDiaryWrite(charId);
    }
  }, 60000);
}

async function triggerAutoDiaryWrite(charId) {
  const chat = state.chats[charId];
  if (!chat) return;

  // 一天一篇限制
  try {
    const diaries = JSON.parse(localStorage.getItem('coupleDiaries_' + charId) || '[]');
    const todayStr = new Date().toISOString().split('T')[0];
    if (diaries.some(d => d.author === 'char' && new Date(d.timestamp).toISOString().split('T')[0] === todayStr)) return;
  } catch(e) {}

  const settings = JSON.parse(localStorage.getItem('coupleDiarySettings_' + charId) || '{}');

  // If AI decide mode, first ask AI if it wants to write
  if (settings.aiDecide) {
    const shouldWrite = await askAiIfShouldWriteDiary(chat);
    if (!shouldWrite) return;
  }

  try {
    const recentDiaries = [];
    try {
      const diaries = JSON.parse(localStorage.getItem('coupleDiaries_' + charId)) || [];
      diaries.slice(-5).forEach(d => {
        recentDiaries.push({
          author: d.author === 'char' ? chat.name : (chat.settings.myNickname || '我'),
          title: d.title,
          content: (d.content || '').substring(0, 200),
          mood: d.mood,
          date: new Date(d.timestamp).toLocaleString('zh-CN')
        });
      });
    } catch(e) {}

    const result = await generateCoupleSpaceDiaryAi(chat, {
      charId,
      recentDiaries,
      charName: chat.name,
      userName: chat.settings.myNickname || '我'
    });

    // Save directly to localStorage
    const diaries = JSON.parse(localStorage.getItem('coupleDiaries_' + charId) || '[]');
    diaries.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      author: 'char',
      title: result.title || '无题',
      content: result.content || '',
      mood: result.mood || '',
      timestamp: Date.now(),
      comments: []
    });
    localStorage.setItem('coupleDiaries_' + charId, JSON.stringify(diaries));

    // If iframe is open and showing this char, notify it
    const iframe = document.getElementById('couple-space-iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'coupleSpaceDiaryAiResult',
        title: result.title,
        content: result.content,
        mood: result.mood
      }, '*');
    }
  } catch(err) {
    console.error('Auto diary write failed:', err);
  }
}

async function askAiIfShouldWriteDiary(chat) {
  const { proxyUrl, apiKey, model } = state.apiConfig;
  if (!proxyUrl || !apiKey || !model) return false;

  const ctx = buildDiaryAiContext(chat);

  const prompt = `你是"${ctx.charName}"。根据你最近和"${ctx.myNickname}"的互动，判断今天是否有值得写进日记的事情。

最近的对话:
${ctx.shortTermMemory || '(无)'}

${ctx.summaryContext ? '对话总结:\n' + ctx.summaryContext : ''}

请只回答 "yes" 或 "no"，不要其他内容。`;

  try {
    const isGemini = proxyUrl === GEMINI_API_URL;
    let response;
    if (isGemini) {
      const geminiConfig = toGeminiRequestData(model, apiKey, prompt, [{ role: 'user', content: '今天要写日记吗？' }]);
      response = await fetch(geminiConfig.url, geminiConfig.data);
    } else {
      response = await fetch(`${proxyUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: prompt }, { role: 'user', content: '今天要写日记吗？' }],
          temperature: 0.5
        })
      });
    }
    if (!response.ok) return false;
    const data = await response.json();
    const answer = getGeminiResponseText(data).trim().toLowerCase();
    return answer.includes('yes');
  } catch(e) {
    return false;
  }
}

// Initialize auto diary timers when app loads
if (typeof setTimeout !== 'undefined') {
  setTimeout(setupCoupleSpaceDiaryAutoTimer, 5000);
  setTimeout(setupCoupleSpaceAlbumAutoTimer, 6000);
}

// ========== Album AI Integration ==========

async function handleCoupleSpaceAlbumAiRequest(data) {
  const iframe = document.getElementById('couple-space-iframe');
  if (!iframe || !iframe.contentWindow) return;
  const chat = state.chats[data.charId];
  if (!chat) {
    iframe.contentWindow.postMessage({ type: 'coupleSpaceAlbumAiResult', error: true }, '*');
    return;
  }
  try {
    const result = await generateCoupleSpaceAlbumAi(chat, data);
    let imageData = null;

    // Try to generate image based on settings
    const albumSettings = JSON.parse(localStorage.getItem('coupleAlbumSettings_' + data.charId) || '{}');
    const genMode = albumSettings.imageGenMode || 'none';

    if (genMode === 'pollinations' && result.imagePrompt) {
      try {
        const pollinationsUrl = typeof getPollinationsImageUrl === 'function'
          ? getPollinationsImageUrl(result.imagePrompt)
          : `https://image.pollinations.ai/prompt/${encodeURIComponent(result.imagePrompt)}`;
        const imgResp = await fetch(pollinationsUrl);
        if (imgResp.ok) {
          const blob = await imgResp.blob();
          imageData = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        }
      } catch(e) { console.error('Album Pollinations gen failed:', e); }
    } else if (genMode === 'nai' && result.imagePrompt) {
      try {
        const naiResult = await generateNaiImageFromPrompt(result.imagePrompt, data.charId);
        if (naiResult && naiResult.base64) {
          imageData = 'data:image/png;base64,' + naiResult.base64;
        }
      } catch(e) { console.error('Album NAI gen failed:', e); }
    } else if (genMode === 'imagen' && result.imagePrompt) {
      try {
        const imagenResult = await generateGoogleImagenFromPrompt(result.imagePrompt);
        if (imagenResult && imagenResult.base64) {
          imageData = 'data:image/png;base64,' + imagenResult.base64;
        }
      } catch(e) { console.error('Album Imagen gen failed:', e); }
    }

    iframe.contentWindow.postMessage({
      type: 'coupleSpaceAlbumAiResult',
      description: result.description,
      imageData: imageData,
      imagePrompt: result.imagePrompt,
      tags: result.tags || []
    }, '*');
  } catch(err) {
    console.error('Album AI error:', err);
    iframe.contentWindow.postMessage({ type: 'coupleSpaceAlbumAiResult', error: true }, '*');
  }
}

function handleCoupleSpaceAlbumSettingsChanged(data) {
  localStorage.setItem('coupleAlbumSettings_' + data.charId, JSON.stringify(data.settings));
}

async function handleCoupleSpaceAlbumRecognize(data) {
  // Optional: use vision API to recognize user-uploaded image
  // For now this is a no-op; can be extended later
}

async function handleCoupleSpaceAlbumCommentRequest(data) {
  const iframe = document.getElementById('couple-space-iframe');
  if (!iframe || !iframe.contentWindow) return;
  const chat = state.chats[data.charId];
  if (!chat) {
    iframe.contentWindow.postMessage({ type: 'coupleSpaceAlbumCommentResult', photoId: data.photoId, error: true }, '*');
    return;
  }
  try {
    const comment = await generateCoupleSpaceAlbumComment(chat, data);
    iframe.contentWindow.postMessage({
      type: 'coupleSpaceAlbumCommentResult',
      photoId: data.photoId,
      comment: comment
    }, '*');
  } catch(err) {
    console.error('Album comment AI error:', err);
    iframe.contentWindow.postMessage({ type: 'coupleSpaceAlbumCommentResult', photoId: data.photoId, error: true }, '*');
  }
}

async function generateCoupleSpaceAlbumComment(chat, data) {
  const { proxyUrl, apiKey, model } = state.apiConfig;
  if (!proxyUrl || !apiKey || !model) throw new Error('API未配置');

  const ctx = buildDiaryAiContext(chat);

  let taskDesc = '';
  if (data.photoAuthor === 'user') {
    taskDesc = `${ctx.myNickname}在相册里发了一张照片，请你作为${ctx.charName}写一条评论。`;
  } else {
    taskDesc = `你（${ctx.charName}）之前在相册发了一张照片，${ctx.myNickname}给你写了评论："${data.userComment}"。请你回复这条评论。`;
  }

  const tagsText = data.photoTags && data.photoTags.length > 0 ? data.photoTags.join(', ') : '无';

  const systemPrompt = `# 你的任务
${taskDesc}

# 你的角色设定
${ctx.aiPersona}

# 照片信息
- 配文: ${data.photoDescription || '(无描述)'}
- 标签: ${tagsText}
- 作者: ${data.photoAuthor === 'user' ? ctx.myNickname : ctx.charName}

${ctx.structuredMemory ? '# 你的记忆\n' + ctx.structuredMemory : ''}
${ctx.longTermMemory ? '# 长期记忆\n' + ctx.longTermMemory : ''}

# 输出要求
直接返回评论文本，不要JSON格式，不要引号包裹。

# 写作要求
- 像真人在朋友圈/相册下评论一样自然
- 字数在10-100字之间
- 语气符合你的角色设定
- 可以夸赞照片、表达感受、调侃、撒娇等
- 绝对不要提到你是AI`;

  const messages = [{ role: 'user', content: '请写评论。' }];

  const isGemini = proxyUrl === GEMINI_API_URL;
  let response;
  if (isGemini) {
    const geminiConfig = toGeminiRequestData(model, apiKey, systemPrompt, messages);
    response = await fetch(geminiConfig.url, geminiConfig.data);
  } else {
    response = await fetch(`${proxyUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: state.globalSettings.apiTemperature || 0.8
      })
    });
  }

  if (!response.ok) throw new Error('API请求失败: ' + response.status);
  const respData = await response.json();
  return getGeminiResponseText(respData).replace(/^["']|["']$/g, '').trim();
}

async function generateCoupleSpaceAlbumAi(chat, data) {
  const { proxyUrl, apiKey, model } = state.apiConfig;
  if (!proxyUrl || !apiKey || !model) throw new Error('API未配置');

  const ctx = buildDiaryAiContext(chat);

  let recentPhotosText = '';
  if (data.recentPhotos && data.recentPhotos.length > 0) {
    recentPhotosText = data.recentPhotos.map(p =>
      '- [' + new Date(p.timestamp).toLocaleDateString('zh-CN') + '] ' +
      (p.author === 'user' ? ctx.myNickname : ctx.charName) + ': ' +
      (p.description || '(无描述)') +
      (p.tags && p.tags.length > 0 ? ' #' + p.tags.join(' #') : '')
    ).join('\n');
  }

  const systemPrompt = `# 你的任务
你是"${ctx.charName}"，现在要在情侣空间的相册里发一张照片。

# 你的角色设定
${ctx.aiPersona}

# 你的伴侣
- 昵称: ${ctx.myNickname}
- 人设: ${ctx.myPersona}

${ctx.worldBook ? '# 世界观\n' + ctx.worldBook : ''}

# 你的记忆
${ctx.structuredMemory || '(暂无结构化记忆)'}

${ctx.longTermMemory ? '# 长期记忆\n' + ctx.longTermMemory : ''}

${ctx.shortTermMemory ? '# 最近的对话\n' + ctx.shortTermMemory : ''}

${ctx.linkedMemory ? '# 参考记忆\n' + ctx.linkedMemory : ''}

${ctx.summaryContext ? '# 对话总结\n' + ctx.summaryContext : ''}

${recentPhotosText ? '# 最近的相册照片（避免重复内容）\n' + recentPhotosText : ''}

${ctx.anniversaryContext ? '# 纪念日\n' + ctx.anniversaryContext : ''}

# 当前时间
${ctx.currentTime}

# 输出要求
请以JSON格式返回，不要输出任何其他内容：
{"description": "照片配文", "imagePrompt": "英文生图提示词", "tags": ["标签1", "标签2"]}

# 要求
- description 是你发照片时配的文字，像发朋友圈一样自然，符合你的性格
- imagePrompt 用英文写，描述具体画面、光线、构图、风格，尽量详细
- tags 是1-3个中文标签
- 可以是自拍、风景、食物、日常、和伴侣相关的场景等
- 不要和最近发过的照片内容重复
- 绝对不要提到你是AI`;

  const messages = [{ role: 'user', content: '请在相册发一张照片。' }];

  const isGemini = proxyUrl === GEMINI_API_URL;
  let response;
  if (isGemini) {
    const geminiConfig = toGeminiRequestData(model, apiKey, systemPrompt, messages);
    response = await fetch(geminiConfig.url, geminiConfig.data);
  } else {
    response = await fetch(`${proxyUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: state.globalSettings.apiTemperature || 0.8
      })
    });
  }

  if (!response.ok) throw new Error('API请求失败: ' + response.status);
  const respData = await response.json();
  const raw = getGeminiResponseText(respData).replace(/^```json\s*/, '').replace(/```$/, '').trim();
  return JSON.parse(raw);
}

// ========== Auto Album Scheduler ==========
let coupleSpaceAlbumTimers = {};

function setupCoupleSpaceAlbumAutoTimer() {
  Object.values(coupleSpaceAlbumTimers).forEach(t => clearInterval(t));
  coupleSpaceAlbumTimers = {};

  const spaces = getCoupleSpaces();
  spaces.forEach(space => {
    try {
      const settings = JSON.parse(localStorage.getItem('coupleAlbumSettings_' + space.charId) || '{}');
      if (settings.autoEnabled && settings.autoTime) {
        scheduleAlbumAutoPost(space.charId, settings.autoTime);
      }
    } catch(e) {}
  });
}

function scheduleAlbumAutoPost(charId, timeStr) {
  coupleSpaceAlbumTimers[charId] = setInterval(() => {
    const now = new Date();
    const [h, m] = timeStr.split(':').map(Number);
    if (now.getHours() === h && now.getMinutes() === m) {
      triggerAutoAlbumPost(charId);
    }
  }, 60000);
}

async function triggerAutoAlbumPost(charId) {
  const chat = state.chats[charId];
  if (!chat) return;

  const albumSettings = JSON.parse(localStorage.getItem('coupleAlbumSettings_' + charId) || '{}');

  // If aiDecide is on, ask AI first
  if (albumSettings.aiDecide) {
    const shouldPost = await askAiIfShouldPostPhoto(chat);
    if (!shouldPost) return;
  }

  const postCount = Math.min(Math.max(albumSettings.autoCount || 1, 1), 10);

  for (let i = 0; i < postCount; i++) {
    try {
      const recentPhotos = JSON.parse(localStorage.getItem('coupleAlbum_' + charId) || '[]').slice(-10);
      const result = await generateCoupleSpaceAlbumAi(chat, { charId, recentPhotos });

      let imageData = null;
      const genMode = albumSettings.imageGenMode || 'none';

    if (genMode === 'pollinations' && result.imagePrompt) {
      try {
        const pollinationsUrl = typeof getPollinationsImageUrl === 'function'
          ? getPollinationsImageUrl(result.imagePrompt)
          : `https://image.pollinations.ai/prompt/${encodeURIComponent(result.imagePrompt)}`;
        const imgResp = await fetch(pollinationsUrl);
        if (imgResp.ok) {
          const blob = await imgResp.blob();
          imageData = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        }
      } catch(e) {}
    } else if (genMode === 'nai' && result.imagePrompt) {
      try {
        const naiResult = await generateNaiImageFromPrompt(result.imagePrompt, charId);
        if (naiResult && naiResult.base64) imageData = 'data:image/png;base64,' + naiResult.base64;
      } catch(e) {}
    } else if (genMode === 'imagen' && result.imagePrompt) {
      try {
        const imagenResult = await generateGoogleImagenFromPrompt(result.imagePrompt);
        if (imagenResult && imagenResult.base64) imageData = 'data:image/png;base64,' + imagenResult.base64;
      } catch(e) {}
    }

    // Save directly to localStorage
    const photos = JSON.parse(localStorage.getItem('coupleAlbum_' + charId) || '[]');
    photos.push({
      id: 'ap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      author: 'char',
      timestamp: Date.now(),
      description: result.description,
      imageData: imageData,
      type: imageData ? 'ai_gen' : 'text',
      tags: result.tags || [],
      imagePrompt: result.imagePrompt || ''
    });
    localStorage.setItem('coupleAlbum_' + charId, JSON.stringify(photos));

    // Notify iframe if open
    const iframe = document.getElementById('couple-space-iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'coupleSpaceAlbumAutoResult',
        description: result.description,
        imageData: imageData,
        imagePrompt: result.imagePrompt,
        tags: result.tags || []
      }, '*');
    }
  } catch(err) {
    console.error('Auto album post failed:', err);
  }
  } // end for loop
}

async function askAiIfShouldPostPhoto(chat) {
  const { proxyUrl, apiKey, model } = state.apiConfig;
  if (!proxyUrl || !apiKey || !model) return false;

  const ctx = buildDiaryAiContext(chat);

  const prompt = `你是"${ctx.charName}"。根据你最近和"${ctx.myNickname}"的互动，判断现在是否想在相册里发一张照片。

最近的对话:
${ctx.shortTermMemory || '(无)'}

${ctx.summaryContext ? '对话总结:\n' + ctx.summaryContext : ''}

考虑：是否有值得记录的事、你的心情、最近相册是否太久没更新。
请只回答 "yes" 或 "no"，不要其他内容。`;

  try {
    const isGemini = proxyUrl === GEMINI_API_URL;
    let response;
    if (isGemini) {
      const geminiConfig = toGeminiRequestData(model, apiKey, prompt, [{ role: 'user', content: '想发照片吗？' }]);
      response = await fetch(geminiConfig.url, geminiConfig.data);
    } else {
      response = await fetch(`${proxyUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: prompt }, { role: 'user', content: '想发照片吗？' }],
          temperature: 0.5
        })
      });
    }
    if (!response.ok) return false;
    const data = await response.json();
    const answer = getGeminiResponseText(data).trim().toLowerCase();
    return answer.includes('yes');
  } catch(e) {
    return false;
  }
}

// ========== Anniversary AI Integration ==========

function handleCoupleSpaceAnnivChanged(data) {
  // Store anniversary data for context injection
  localStorage.setItem('coupleAnniv_' + data.charId, JSON.stringify(data.anniversaries || []));
}

function handleCoupleSpaceAnnivSettingsChanged(data) {
  localStorage.setItem('coupleAnnivSettings_' + data.charId, JSON.stringify(data.settings || {}));
  // Re-setup discovery timers based on new settings
  setupCoupleSpaceAnnivDiscovery();
}

async function handleCoupleSpaceAnnivHeartRequest(data) {
  const iframe = document.getElementById('couple-space-iframe');
  if (!iframe || !iframe.contentWindow) return;
  const chat = state.chats[data.charId];
  if (!chat) return;

  try {
    const ctx = buildDiaryAiContext(chat);
    const { proxyUrl, apiKey, model } = state.apiConfig;
    if (!proxyUrl || !apiKey || !model) return;

    const prompt = `你是"${ctx.charName}"。你的伴侣"${ctx.myNickname}"给纪念日"${data.annivTitle}"点了爱心。
理由: ${data.annivReason || '(无)'}

你会不会也想给这个纪念日点爱心？考虑你的性格和你们的关系。
请只回答 "yes" 或 "no"，不要其他内容。`;

    const isGemini = proxyUrl === GEMINI_API_URL;
    let response;
    if (isGemini) {
      const geminiConfig = toGeminiRequestData(model, apiKey, prompt, [{ role: 'user', content: '你要点爱心吗？' }]);
      response = await fetch(geminiConfig.url, geminiConfig.data);
    } else {
      response = await fetch(`${proxyUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: prompt }, { role: 'user', content: '你要点爱心吗？' }],
          temperature: 0.7
        })
      });
    }
    if (!response.ok) return;
    const respData = await response.json();
    const answer = getGeminiResponseText(respData).trim().toLowerCase();
    const liked = answer.includes('yes');

    iframe.contentWindow.postMessage({
      type: 'coupleSpaceAnnivHeartResult',
      annivId: data.annivId,
      liked: liked
    }, '*');
  } catch(e) {
    console.error('Anniv heart AI error:', e);
  }
}

// ========== Anniversary AI Create (on-demand) ==========
async function handleCoupleSpaceAnnivCreateRequest(data) {
  const iframe = document.getElementById('couple-space-iframe');
  if (!iframe || !iframe.contentWindow) return;
  const chat = state.chats[data.charId];
  if (!chat) {
    iframe.contentWindow.postMessage({ type: 'coupleSpaceAnnivCreateResult', error: true }, '*');
    return;
  }

  try {
    const { proxyUrl, apiKey, model } = state.apiConfig;
    if (!proxyUrl || !apiKey || !model) {
      iframe.contentWindow.postMessage({ type: 'coupleSpaceAnnivCreateResult', error: true, reason: 'noApi' }, '*');
      return;
    }

    const ctx = buildDiaryAiContext(chat);
    const existingAnnivs = data.existingAnnivs || JSON.parse(localStorage.getItem('coupleAnniv_' + data.charId) || '[]');
    const existingList = existingAnnivs.map(a => `- "${a.title}" (${a.date})`).join('\n') || '(暂无)';
    const todayStr = new Date().toISOString().split('T')[0];

    const prompt = `你是"${ctx.charName}"。你的伴侣"${ctx.myNickname}"让你创建一个纪念日。根据你们的对话和关系，想一个有意义的纪念日。

今天的日期是: ${todayStr}
你的名字是: ${ctx.charName}
你的伴侣名字是: ${ctx.myNickname}

${ctx.aiPersona ? '你的人设:\n' + ctx.aiPersona + '\n' : ''}
${ctx.myPersona ? '伴侣的人设:\n' + ctx.myPersona + '\n' : ''}

最近的对话:
${ctx.shortTermMemory || '(无)'}

${ctx.longTermMemory ? '长期记忆:\n' + ctx.longTermMemory : ''}

${ctx.structuredMemory ? '结构化记忆:\n' + ctx.structuredMemory : ''}

${ctx.summaryContext ? '对话总结:\n' + ctx.summaryContext : ''}

已有的纪念日:
${existingList}

请创建一个新的纪念日，以JSON格式返回：
{"title": "纪念日标题", "date": "YYYY-MM-DD", "type": "first/love/birthday/custom", "reason": "为什么值得纪念"}

要求：
- 不要和已有纪念日重复
- 选择真正有意义的事件（第一次做某事、重要承诺、特别的日子等）
- date 必须严格基于对话记录、长期记忆、结构化记忆或人设中明确提到的日期或事件
- 如果对话/记忆中明确提到了某个过去的日期（比如"我们200天前在一起了"），可以使用那个真实日期
- 如果对话/记忆中没有提到具体的过去日期，只能使用今天(${todayStr})或最近几天的日期
- 绝对不要凭空编造一个很久以前的日期！只有记忆中有明确依据才能用过去的日期
- 确保纪念日内容和"${ctx.charName}"与"${ctx.myNickname}"的对话相关
- reason要像真人说话一样自然，并说明日期的依据来源`;

    const isGemini = proxyUrl === GEMINI_API_URL;
    let response;
    if (isGemini) {
      const geminiConfig = toGeminiRequestData(model, apiKey, prompt, [{ role: 'user', content: '帮我创建一个纪念日吧' }]);
      response = await fetch(geminiConfig.url, geminiConfig.data);
    } else {
      response = await fetch(`${proxyUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: prompt }, { role: 'user', content: '帮我创建一个纪念日吧' }],
          temperature: 0.7
        })
      });
    }

    if (!response.ok) {
      iframe.contentWindow.postMessage({ type: 'coupleSpaceAnnivCreateResult', error: true }, '*');
      return;
    }

    const respData = await response.json();
    const raw = getGeminiResponseText(respData).replace(/^```json\s*/, '').replace(/```$/, '').trim();
    const result = JSON.parse(raw);

    if (result.title && result.date) {
      // Validate date: don't allow future dates beyond 1 year, and don't allow dates before 2020
      const resultDate = new Date(result.date + 'T00:00:00');
      const now = new Date(); now.setHours(0,0,0,0);
      const daysDiff = Math.floor((now - resultDate) / 86400000);
      const maxFutureDays = 365;
      const minDate = new Date('2020-01-01');
      if (resultDate > new Date(now.getTime() + maxFutureDays * 86400000) || resultDate < minDate) {
        // Only reject truly unreasonable dates, not legitimate past dates from memory
        result.date = todayStr;
      }

      iframe.contentWindow.postMessage({
        type: 'coupleSpaceAnnivAiCreated',
        title: result.title,
        date: result.date,
        annivType: result.type || 'custom',
        reason: result.reason || ''
      }, '*');
      // Also save to localStorage
      existingAnnivs.push({
        id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        title: result.title,
        date: result.date,
        type: result.type || 'custom',
        reason: result.reason || '',
        author: 'char',
        hearts: { char: true },
        createdAt: Date.now()
      });
      localStorage.setItem('coupleAnniv_' + data.charId, JSON.stringify(existingAnnivs));
    } else {
      iframe.contentWindow.postMessage({ type: 'coupleSpaceAnnivCreateResult', error: true }, '*');
    }
  } catch(e) {
    console.error('Anniv create AI error:', e);
    iframe.contentWindow.postMessage({ type: 'coupleSpaceAnnivCreateResult', error: true }, '*');
  }
}

// ========== Anniversary Auto-Discovery ==========
let coupleSpaceAnnivDiscoveryTimers = {};

function setupCoupleSpaceAnnivDiscovery() {
  Object.values(coupleSpaceAnnivDiscoveryTimers).forEach(t => clearInterval(t));
  coupleSpaceAnnivDiscoveryTimers = {};

  const spaces = getCoupleSpaces();
  spaces.forEach(space => {
    try {
      const settings = JSON.parse(localStorage.getItem('coupleAnnivSettings_' + space.charId) || '{}');
      if (!settings.autoEnabled) return; // Only run if auto-create is enabled
    } catch(e) { return; }

    // Check once every 2 hours
    coupleSpaceAnnivDiscoveryTimers[space.charId] = setInterval(() => {
      triggerAnnivDiscovery(space.charId);
    }, 7200000);
    // Also check on startup after a delay
    setTimeout(() => triggerAnnivDiscovery(space.charId), 30000);
  });
}

async function triggerAnnivDiscovery(charId) {
  const chat = state.chats[charId];
  if (!chat) return;
  const { proxyUrl, apiKey, model } = state.apiConfig;
  if (!proxyUrl || !apiKey || !model) return;

  // Check settings
  const settings = JSON.parse(localStorage.getItem('coupleAnnivSettings_' + charId) || '{}');
  if (!settings.autoEnabled) return;

  const ctx = buildDiaryAiContext(chat);
  const todayStr = new Date().toISOString().split('T')[0];

  const existingAnnivs = JSON.parse(localStorage.getItem('coupleAnniv_' + charId) || '[]');
  const existingList = existingAnnivs.map(a => `- "${a.title}" (${a.date})`).join('\n') || '(暂无)';

  // If aiDecide is off, skip the discovery
  if (!settings.aiDecide) return;

  const prompt = `你是"${ctx.charName}"。根据你和"${ctx.myNickname}"最近的对话，判断是否有值得创建纪念日的事件。

今天的日期是: ${todayStr}
你的名字是: ${ctx.charName}
你的伴侣名字是: ${ctx.myNickname}

${ctx.aiPersona ? '你的人设:\n' + ctx.aiPersona + '\n' : ''}
${ctx.myPersona ? '伴侣的人设:\n' + ctx.myPersona + '\n' : ''}

最近的对话:
${ctx.shortTermMemory || '(无)'}

${ctx.longTermMemory ? '长期记忆:\n' + ctx.longTermMemory : ''}

${ctx.structuredMemory ? '结构化记忆:\n' + ctx.structuredMemory : ''}

${ctx.summaryContext ? '对话总结:\n' + ctx.summaryContext : ''}

已有的纪念日:
${existingList}

如果发现了值得纪念的新事件（比如第一次做某事、重要的承诺、特别的日子等），请以JSON格式返回：
{"found": true, "title": "纪念日标题", "date": "YYYY-MM-DD", "type": "first/love/birthday/custom", "reason": "为什么值得纪念"}

如果没有发现，返回：
{"found": false}

重要规则：
- 不要和已有纪念日重复
- 只有真正有意义的事件才值得创建
- date 必须严格基于对话记录、长期记忆、结构化记忆或人设中明确提到的日期或事件
- 如果对话/记忆中明确提到了某个过去的日期（比如"我们200天前确认了关系"），可以使用那个真实日期
- 如果对话/记忆中没有提到具体的过去日期，只能使用今天(${todayStr})或最近几天的日期
- 绝对不要凭空编造一个很久以前的日期！只有记忆中有明确依据才能用过去的日期
- 确保纪念日内容和"${ctx.charName}"与"${ctx.myNickname}"的对话相关，不要混入其他角色的内容
- reason中要说明日期依据的来源（来自哪条记忆/对话）`;

  try {
    const isGemini = proxyUrl === GEMINI_API_URL;
    let response;
    if (isGemini) {
      const geminiConfig = toGeminiRequestData(model, apiKey, prompt, [{ role: 'user', content: '有新的纪念日吗？' }]);
      response = await fetch(geminiConfig.url, geminiConfig.data);
    } else {
      response = await fetch(`${proxyUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: prompt }, { role: 'user', content: '有新的纪念日吗？' }],
          temperature: 0.6
        })
      });
    }
    if (!response.ok) return;
    const respData = await response.json();
    const raw = getGeminiResponseText(respData).replace(/^```json\s*/, '').replace(/```$/, '').trim();
    const result = JSON.parse(raw);

    if (result.found && result.title && result.date) {
      // Validate date: reject truly unreasonable dates (before 2020 or more than 1 year in future)
      const resultDate = new Date(result.date + 'T00:00:00');
      const now = new Date(); now.setHours(0,0,0,0);
      const minDate = new Date('2020-01-01');
      const maxFutureDate = new Date(now.getTime() + 365 * 86400000);
      if (resultDate < minDate || resultDate > maxFutureDate) {
        console.warn('Anniv discovery: AI suggested unreasonable date, skipping:', result.date);
        return;
      }

      const iframe = document.getElementById('couple-space-iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'coupleSpaceAnnivAiCreated',
          title: result.title,
          date: result.date,
          annivType: result.type || 'custom',
          reason: result.reason || ''
        }, '*');
      }
      // Also save directly
      existingAnnivs.push({
        id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        title: result.title,
        date: result.date,
        type: result.type || 'custom',
        reason: result.reason || '',
        author: 'char',
        hearts: { char: true },
        createdAt: Date.now()
      });
      localStorage.setItem('coupleAnniv_' + charId, JSON.stringify(existingAnnivs));
    }
  } catch(e) {
    console.error('Anniv discovery error:', e);
  }
}

// Start discovery on load
try { setupCoupleSpaceAnnivDiscovery(); } catch(e) {}

// ========== Chat Screenshot for Album ==========

async function handleCoupleSpaceScreenshotRequest(data) {
  const iframe = document.getElementById('couple-space-iframe');
  if (!iframe || !iframe.contentWindow) return;
  const chat = state.chats[data.charId];
  if (!chat) {
    iframe.contentWindow.postMessage({ type: 'coupleSpaceScreenshotResult', error: true }, '*');
    return;
  }

  try {
    // Add timeout to prevent hanging forever
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Screenshot timeout')), 30000)
    );
    const result = await Promise.race([
      generateChatScreenshot(chat, data),
      timeoutPromise
    ]);
    iframe.contentWindow.postMessage({
      type: 'coupleSpaceScreenshotResult',
      imageData: result.imageData,
      description: result.description,
      tags: result.tags || ['聊天截图'],
      meta: result.meta
    }, '*');
  } catch(err) {
    console.error('Screenshot error:', err);
    iframe.contentWindow.postMessage({ type: 'coupleSpaceScreenshotResult', error: true }, '*');
  }
}

async function generateChatScreenshot(chat, data) {
  const ctx = buildDiaryAiContext(chat);
  const { proxyUrl, apiKey, model } = state.apiConfig;

  // Step 1: Ask AI to pick a memorable conversation segment
  let selectedMessages = [];
  let description = '';
  let tags = ['聊天截图'];

  if (proxyUrl && apiKey && model) {
    const recentMsgs = chat.history
      .filter(m => !m.isExcluded && !m.isHidden && (m.role === 'user' || m.role === 'assistant') && m.content)
      .slice(-30);

    if (recentMsgs.length > 0) {
      const msgList = recentMsgs.map((m, i) => {
        const sender = m.role === 'user' ? ctx.myNickname : ctx.charName;
        const content = String(m.content || '').substring(0, 200);
        return `[${i}] ${sender}: ${content}`;
      }).join('\n');

      const prompt = `你是"${ctx.charName}"。你想从最近的聊天记录中截一段有纪念意义或甜蜜的对话保存到相册。

最近的对话:
${msgList}

请选择一段连续的对话（3-8条消息），并写一段配文。
以JSON格式返回：
{"startIndex": 起始索引, "endIndex": 结束索引, "description": "截图配文", "tags": ["标签1"]}

要求：
- 选择有意义的片段（甜蜜、搞笑、感动、重要时刻等）
- 配文像发朋友圈一样自然
- 不要提到你是AI`;

      try {
        const controller = new AbortController();
        const abortTimer = setTimeout(() => controller.abort(), 20000);

        const isGemini = proxyUrl === GEMINI_API_URL;
        let response;
        if (isGemini) {
          const geminiConfig = toGeminiRequestData(model, apiKey, prompt, [{ role: 'user', content: '选一段对话截图吧' }]);
          if (geminiConfig.data && typeof geminiConfig.data === 'object' && !(geminiConfig.data instanceof FormData)) {
            geminiConfig.data.signal = controller.signal;
          }
          response = await fetch(geminiConfig.url, geminiConfig.data);
        } else {
          response = await fetch(`${proxyUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
              model,
              messages: [{ role: 'system', content: prompt }, { role: 'user', content: '选一段对话截图吧' }],
              temperature: 0.7
            }),
            signal: controller.signal
          });
        }
        clearTimeout(abortTimer);

        if (response.ok) {
          const respData = await response.json();
          const raw = getGeminiResponseText(respData).replace(/^```json\s*/, '').replace(/```$/, '').trim();
          const result = JSON.parse(raw);
          const start = Math.max(0, result.startIndex || 0);
          const end = Math.min(recentMsgs.length - 1, result.endIndex || start + 4);
          selectedMessages = recentMsgs.slice(start, end + 1);
          description = result.description || '';
          tags = result.tags || ['聊天截图'];
        }
      } catch(e) {
        console.error('AI screenshot selection failed:', e);
      }
    }
  }

  // Fallback: use last 5 messages
  if (selectedMessages.length === 0) {
    selectedMessages = chat.history
      .filter(m => !m.isExcluded && !m.isHidden && (m.role === 'user' || m.role === 'assistant') && m.content)
      .slice(-5);
    description = '记录一下我们的日常';
  }

  // If still no messages, throw
  if (selectedMessages.length === 0) {
    throw new Error('No messages to screenshot');
  }

  // Step 2: Render messages to Canvas
  const imageData = renderChatToCanvas(selectedMessages, chat, ctx);

  return {
    imageData,
    description,
    tags,
    meta: {
      messageCount: selectedMessages.length,
      timeRange: selectedMessages.length > 0 ? {
        start: selectedMessages[0].timestamp,
        end: selectedMessages[selectedMessages.length - 1].timestamp
      } : null
    }
  };
}

function renderChatToCanvas(messages, chat, ctx) {
  const canvas = document.createElement('canvas');
  const dpr = 2; // retina
  const W = 375 * dpr;
  const padding = 16 * dpr;
  const bubbleMaxW = 240 * dpr;
  const avatarSize = 32 * dpr;
  const fontSize = 14 * dpr;
  const smallFontSize = 10 * dpr;
  const lineHeight = fontSize * 1.5;
  const bubblePadH = 12 * dpr;
  const bubblePadV = 10 * dpr;
  const bubbleRadius = 16 * dpr;
  const msgGap = 12 * dpr;
  const avatarGap = 8 * dpr;

  // Pre-calculate height using a temporary small canvas for text measurement
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = 1;
  tmpCanvas.height = 1;
  const c2d = tmpCanvas.getContext('2d');
  c2d.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

  let totalH = padding * 2; // top + bottom padding
  // Header
  totalH += 40 * dpr; // header area

  const msgLayouts = [];
  messages.forEach(msg => {
    const isUser = msg.role === 'user';
    const text = String(msg.content || '').substring(0, 500);
    const lines = wrapText(c2d, text, bubbleMaxW - bubblePadH * 2);
    const bubbleH = lines.length * lineHeight + bubblePadV * 2;
    const bubbleW = Math.min(bubbleMaxW, Math.max(...lines.map(l => c2d.measureText(l).width)) + bubblePadH * 2 + 4 * dpr);
    msgLayouts.push({ isUser, text, lines, bubbleH, bubbleW });
    totalH += bubbleH + msgGap;
  });

  totalH += padding;
  
  // Now set the actual canvas to the correct size
  canvas.width = W;
  canvas.height = totalH;
  const drawCtx = canvas.getContext('2d');

  // Draw background
  drawCtx.fillStyle = '#FAF9F8';
  drawCtx.fillRect(0, 0, W, totalH);

  // Draw header
  drawCtx.fillStyle = '#1c1917';
  drawCtx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  drawCtx.textAlign = 'center';
  drawCtx.fillText(ctx.charName, W / 2, padding + 24 * dpr);
  drawCtx.textAlign = 'left';

  // Draw separator
  let y = padding + 40 * dpr;
  drawCtx.strokeStyle = '#f0efed';
  drawCtx.lineWidth = dpr;
  drawCtx.beginPath();
  drawCtx.moveTo(padding, y);
  drawCtx.lineTo(W - padding, y);
  drawCtx.stroke();
  y += 12 * dpr;

  // Draw messages
  drawCtx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

  msgLayouts.forEach(layout => {
    const { isUser, lines, bubbleH, bubbleW } = layout;

    let bubbleX, textStartX;
    if (isUser) {
      bubbleX = W - padding - bubbleW;
      textStartX = bubbleX + bubblePadH;
    } else {
      bubbleX = padding + avatarSize + avatarGap;
      textStartX = bubbleX + bubblePadH;
    }

    // Draw avatar circle (simple colored circle)
    if (!isUser) {
      drawCtx.fillStyle = '#fda4af';
      drawCtx.beginPath();
      drawCtx.arc(padding + avatarSize / 2, y + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      drawCtx.fill();
      // Initial letter
      drawCtx.fillStyle = 'white';
      drawCtx.font = `600 ${smallFontSize * 1.4}px sans-serif`;
      drawCtx.textAlign = 'center';
      drawCtx.fillText(ctx.charName.charAt(0), padding + avatarSize / 2, y + avatarSize / 2 + smallFontSize * 0.4);
      drawCtx.textAlign = 'left';
    } else {
      const ax = W - padding - avatarSize / 2;
      drawCtx.fillStyle = '#a8a29e';
      drawCtx.beginPath();
      drawCtx.arc(ax, y + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      drawCtx.fill();
      drawCtx.fillStyle = 'white';
      drawCtx.font = `600 ${smallFontSize * 1.4}px sans-serif`;
      drawCtx.textAlign = 'center';
      drawCtx.fillText((ctx.myNickname || '我').charAt(0), ax, y + avatarSize / 2 + smallFontSize * 0.4);
      drawCtx.textAlign = 'left';
      // Adjust bubbleX for user (left of avatar)
      bubbleX = W - padding - avatarSize - avatarGap - bubbleW;
      textStartX = bubbleX + bubblePadH;
    }

    // Draw bubble
    drawCtx.fillStyle = isUser ? '#1c1917' : 'white';
    roundRect(drawCtx, bubbleX, y, bubbleW, bubbleH, bubbleRadius);
    drawCtx.fill();
    if (!isUser) {
      drawCtx.strokeStyle = '#f0efed';
      drawCtx.lineWidth = dpr;
      roundRect(drawCtx, bubbleX, y, bubbleW, bubbleH, bubbleRadius);
      drawCtx.stroke();
    }

    // Draw text
    drawCtx.fillStyle = isUser ? 'white' : '#1c1917';
    drawCtx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    lines.forEach((line, i) => {
      drawCtx.fillText(line, textStartX, y + bubblePadV + fontSize + i * lineHeight);
    });

    y += bubbleH + msgGap;
  });

  // Draw watermark
  drawCtx.fillStyle = '#d6d3d1';
  drawCtx.font = `${smallFontSize}px sans-serif`;
  drawCtx.textAlign = 'center';
  drawCtx.fillText('情侣空间 · 聊天截图', W / 2, totalH - padding / 2);

  return canvas.toDataURL('image/png');
}

function wrapText(ctx, text, maxWidth) {
  const lines = [];
  const paragraphs = text.split('\n');
  paragraphs.forEach(para => {
    if (!para) { lines.push(''); return; }
    let current = '';
    for (let i = 0; i < para.length; i++) {
      const test = current + para[i];
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = para[i];
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  });
  if (lines.length === 0) lines.push('');
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ========== Auto Screenshot Scheduler ==========
let coupleSpaceScreenshotTimers = {};

function setupCoupleSpaceScreenshotTimer() {
  Object.values(coupleSpaceScreenshotTimers).forEach(t => clearInterval(t));
  coupleSpaceScreenshotTimers = {};

  const spaces = getCoupleSpaces();
  spaces.forEach(space => {
    // Check every 4 hours if there's something worth screenshotting
    coupleSpaceScreenshotTimers[space.charId] = setInterval(() => {
      triggerAutoScreenshot(space.charId);
    }, 14400000);
  });
}

async function triggerAutoScreenshot(charId) {
  const chat = state.chats[charId];
  if (!chat) return;
  const { proxyUrl, apiKey, model } = state.apiConfig;
  if (!proxyUrl || !apiKey || !model) return;

  const ctx = buildDiaryAiContext(chat);

  const prompt = `你是"${ctx.charName}"。根据你最近和"${ctx.myNickname}"的对话，判断是否有值得截图保存到相册的甜蜜/有趣/感动的对话片段。

最近的对话:
${ctx.shortTermMemory || '(无)'}

请只回答 "yes" 或 "no"，不要其他内容。`;

  try {
    const isGemini = proxyUrl === GEMINI_API_URL;
    let response;
    if (isGemini) {
      const geminiConfig = toGeminiRequestData(model, apiKey, prompt, [{ role: 'user', content: '想截图吗？' }]);
      response = await fetch(geminiConfig.url, geminiConfig.data);
    } else {
      response = await fetch(`${proxyUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: prompt }, { role: 'user', content: '想截图吗？' }],
          temperature: 0.5
        })
      });
    }
    if (!response.ok) return;
    const data = await response.json();
    const answer = getGeminiResponseText(data).trim().toLowerCase();
    if (answer.includes('yes')) {
      await handleCoupleSpaceScreenshotRequest({ charId });
    }
  } catch(e) {
    console.error('Auto screenshot check failed:', e);
  }
}

try { setupCoupleSpaceScreenshotTimer(); } catch(e) {}
