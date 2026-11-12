
/**
 * GAS WebアプリのURL
 */
const GAS_URL =
  'https://script.google.com/macros/s/AKfycbyYRbsUhMPrHz1BvNcq3Z-jzXpq7tLeCxdv20hR7wf69l9EAKnVNjHHEGpo0AMeasEKLg/exec';

/**
 * 状態
 */
let selectedParticipant = null;
let receptionMethod = '';
let requestInProgress = false;

/**
 * 画面切り替え
 */
function showPage(pageId) {
  const pageIds = [
    'homePage',
    'confirmPage',
    'completePage'
  ];

  pageIds.forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });

  const target = document.getElementById(pageId);

  if (!target) {
    console.error('画面が見つかりません:', pageId);
    return;
  }

  target.classList.remove('hidden');
}

/**
 * JSONPでGASに問い合わせ
 */
function gasGet(params) {
  return new Promise((resolve, reject) => {
    const callbackName =
      'gasCallback_' + Date.now() + '_' +
      Math.floor(Math.random() * 100000);

    const script = document.createElement('script');

    const query = new URLSearchParams({
      ...params,
      callback: callbackName
    });

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('GASとの通信がタイムアウトしました。'));
    }, 15000);

    function cleanup() {
      clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = result => {
      cleanup();
      resolve(result);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('GASとの通信に失敗しました。'));
    };

    script.src = GAS_URL + '?' + query.toString();

    document.body.appendChild(script);
  });
}

/**
 * ID検索
 */
async function searchId(id, method = 'QRコード') {
  const message = document.getElementById('homeMessage');

  message.textContent = '参加者を検索しています...';

  try {
    const result = await gasGet({
      action: 'searchId',
      id: id
    });

    message.textContent = '';

    if (!result.success) {
      alert(result.message);
      return;
    }

    receptionMethod = method;
    selectParticipant(result.participant);

  } catch (error) {
    message.textContent = error.message;
  }
}

/**
 * 氏名検索
 */
async function searchName() {
  const name = document.getElementById('nameInput').value.trim();
  const results = document.getElementById('searchResults');

  results.replaceChildren();

  if (!name) {
    results.textContent = '氏名を入力してください。';
    return;
  }

  results.textContent = '検索中...';

  try {
    const result = await gasGet({
      action: 'searchName',
      name: name
    });

    results.replaceChildren();

    if (!result.success) {
      results.textContent = result.message;
      return;
    }

    result.participants.forEach(participant => {
      const button = document.createElement('button');

      button.className = 'candidate';

      button.textContent =
        participant.name + ' / ' +
        participant.furigana + ' / ' +
        participant.className + ' / ID:' +
        participant.id +
        (participant.received ? '（受付済み）' : '');

      button.addEventListener('click', () => {
        receptionMethod = '氏名検索';
        selectParticipant(participant);
      });

      results.appendChild(button);
    });

  } catch (error) {
    results.textContent = error.message;
  }
}

/**
 * 参加者選択
 */

function selectParticipant(participant) {
  console.log('selectParticipant開始:', participant);

  selectedParticipant = participant;

  document.getElementById('confirmId').textContent =
    participant.id;

  document.getElementById('confirmName').textContent =
    participant.name;

  document.getElementById('confirmFurigana').textContent =
    participant.furigana;

  document.getElementById('confirmClass').textContent =
    participant.className;

  document.getElementById('confirmFee').textContent =
    participant.feePaid ? '納入済み' : '未納';

  document.getElementById('duplicateMessage')
    .classList.toggle('hidden', !participant.received);

  const button = document.getElementById('receptionButton');

  button.disabled = false;

  button.textContent = participant.received
    ? '再受付する'
    : 'この内容で受付する';

  console.log('参加者情報の表示完了');

  showPage('confirmPage');

  console.log('確認画面への切り替え完了');
}

/**
 * 受付記録
 */
function completeReception() {
  if (!selectedParticipant || requestInProgress) return;

  const allowDuplicate = selectedParticipant.received;

  if (allowDuplicate) {
    if (!confirm('既に受付済みです。再受付しますか？')) {
      return;
    }
  }

  sendReception(allowDuplicate);
}

/**
 * POSTを非表示iframeに送信
 */
function sendReception(allowDuplicate) {
  if (requestInProgress) return;

  requestInProgress = true;

  const button = document.getElementById('receptionButton');

  button.disabled = true;
  button.textContent = '受付処理中...';

  const requestId =
    Date.now() + '_' + Math.floor(Math.random() * 100000);

  document.getElementById('postId').value =
    selectedParticipant.id;

  document.getElementById('postMethod').value =
    receptionMethod;

  document.getElementById('postAllowDuplicate').value =
    String(allowDuplicate);

  document.getElementById('postRequestId').value =
    requestId;

  const form = document.getElementById('postForm');

  form.action = GAS_URL;

  window.currentReceptionRequestId = requestId;

  form.submit();
}

/**
 * GASから受付結果を受信
 */
window.addEventListener('message', event => {
  const data = event.data;

  if (!data || data.type !== 'RECEPTION_RESULT') return;

  const result = data.result;

  if (!result ||
      result.requestId !== window.currentReceptionRequestId) {
    return;
  }

  requestInProgress = false;

  const button = document.getElementById('receptionButton');

  if (result.status === 'duplicate') {
    if (confirm('既に受付済みです。再受付しますか？')) {
      sendReception(true);
    } else {
      button.disabled = false;
      button.textContent = 'この内容で受付する';
    }
    return;
  }

  if (!result.success) {
    alert(result.message || '受付に失敗しました。');
    button.disabled = false;
    button.textContent = 'この内容で受付する';
    return;
  }

  document.getElementById('completeName').textContent =
    result.participant.name + ' 様';

  document.getElementById('completeTime').textContent =
    result.receptionTime;

  showPage('complete');
});

/**
 * ホームに戻る
 */
function backHome() {
  selectedParticipant = null;
  receptionMethod = '';
  requestInProgress = false;

  document.getElementById('nameInput').value = '';
  document.getElementById('searchResults').replaceChildren();
  document.getElementById('homeMessage').textContent = '';

  document.getElementById('receptionButton').disabled = false;

  showPage('home');

  // カメラが停止していれば再起動
  if (window.startQrCamera) {
    window.startQrCamera();
  }
}

/**
 * ボタン設定
 */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('searchButton')
    .addEventListener('click', searchName);

  document.getElementById('nameInput')
    .addEventListener('keydown', event => {
      if (event.key === 'Enter') searchName();
    });

  document.getElementById('receptionButton')
    .addEventListener('click', completeReception);

  document.getElementById('backButton')
    .addEventListener('click', backHome);

  document.getElementById('nextButton')
    .addEventListener('click', backHome);
});
