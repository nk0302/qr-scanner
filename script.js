
/**
 * GAS WebアプリのURL
 */
const GAS_URL =
  'https://script.google.com/macros/s/AKfycbwCMfocf9maKKFmQak8REA-HbaFAZvH4Vyw_O9-Omo-5r4T7qO2rcnWBja7Hru2NPeFLg/exec';


/**
 * 状態管理
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
    const page = document.getElementById(id);

    if (page) {
      page.classList.add('hidden');
    }
  });

  const target = document.getElementById(pageId);

  if (!target) {
    console.error('画面が見つかりません:', pageId);
    return;
  }

  target.classList.remove('hidden');
}


/**
 * GASとのJSONP通信
 */
function gasGet(params) {
  return new Promise((resolve, reject) => {

    const callbackName =
      'gasCallback_' +
      Date.now() +
      '_' +
      Math.floor(Math.random() * 100000);

    const script = document.createElement('script');

    const query = new URLSearchParams({
      ...params,
      callback: callbackName
    });

    let finished = false;

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('GASとの通信がタイムアウトしました。'));
    }, 15000);

    function cleanup() {
      if (finished) return;

      finished = true;

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

    script.src =
      GAS_URL + '?' + query.toString();

    document.body.appendChild(script);
  });
}


/**
 * QRコードからID検索
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

      // QR読み取り後にカメラが停止している場合は再起動
      if (window.startQrCamera) {
        window.startQrCamera();
      }

      return;
    }

    receptionMethod = method;

    selectParticipant(result.participant);

  } catch (error) {
    console.error('ID検索エラー:', error);

    message.textContent = error.message;

    if (window.startQrCamera) {
      window.startQrCamera();
    }
  }
}


/**
 * 氏名検索
 */
async function searchName() {
  const name =
    document.getElementById('nameInput').value.trim();

  const results =
    document.getElementById('searchResults');

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

      button.type = 'button';
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
    console.error('氏名検索エラー:', error);

    results.textContent = error.message;
  }
}


/**
 * 参加者選択・確認画面表示
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

  // 受付済み表示
  document.getElementById('duplicateMessage')
    .classList.toggle(
      'hidden',
      !participant.received
    );

  const button =
    document.getElementById('receptionButton');

  button.disabled = false;

  button.textContent = participant.received
    ? '再受付する'
    : 'この内容で受付する';

  console.log('参加者情報の表示完了');

  showPage('confirmPage');

  console.log('確認画面への切り替え完了');
}


/**
 * 受付ボタン
 */
function completeReception() {
  if (!selectedParticipant || requestInProgress) {
    return;
  }

  const allowDuplicate =
    selectedParticipant.received;

  // 既に受付済みの場合は確認
  if (allowDuplicate) {
    const accepted = confirm(
      '既に受付済みです。再受付しますか？'
    );

    if (!accepted) {
      return;
    }
  }

  sendReception(allowDuplicate);
}


/**
 * 受付登録
 *
 * JSONPを利用してGASに受付情報を送信する
 */
async function sendReception(allowDuplicate) {
  if (requestInProgress || !selectedParticipant) {
    return;
  }

  requestInProgress = true;

  const button =
    document.getElementById('receptionButton');

  button.disabled = true;
  button.textContent = '受付処理中...';

  const requestId =
    Date.now() + '_' +
    Math.floor(Math.random() * 100000);

  try {
    console.log('受付処理開始');

    const result = await gasGet({
      action: 'registerReception',

      id: selectedParticipant.id,

      method: receptionMethod,

      allowDuplicate: String(allowDuplicate),

      requestId: requestId
    });

    console.log('受付処理結果:', result);

    requestInProgress = false;

    // サーバー側で重複を検出した場合
    if (result.status === 'duplicate') {
      const accepted = confirm(
        '既に受付済みです。再受付しますか？'
      );

      if (accepted) {
        button.disabled = false;

        await sendReception(true);

      } else {
        button.disabled = false;
        button.textContent = 'この内容で受付する';
      }

      return;
    }

    // 受付失敗
    if (!result.success) {
      alert(
        result.message || '受付に失敗しました。'
      );

      button.disabled = false;
      button.textContent = 'この内容で受付する';

      return;
    }

    // 受付完了画面
    document.getElementById('completeName').textContent =
      result.participant.name + ' 様';

    document.getElementById('completeTime').textContent =
      result.receptionTime;

    showPage('completePage');

  } catch (error) {
    console.error('受付エラー:', error);

    requestInProgress = false;

    button.disabled = false;
    button.textContent = 'この内容で受付する';

    alert(
      '受付処理に失敗しました。\n' +
      error.message +
      '\n\n受付ログに記録されていないか確認してください。'
    );
  }
}


/**
 * ホーム画面に戻る
 */
function backHome() {
  selectedParticipant = null;
  receptionMethod = '';
  requestInProgress = false;

  document.getElementById('nameInput').value = '';

  document.getElementById('searchResults')
    .replaceChildren();

  document.getElementById('homeMessage').textContent = '';

  const button =
    document.getElementById('receptionButton');

  button.disabled = false;
  button.textContent = 'この内容で受付する';

  showPage('homePage');

  // QRカメラ再起動
  if (window.startQrCamera) {
    window.startQrCamera();
  }
}


/**
 * イベント登録
 */
document.addEventListener('DOMContentLoaded', () => {

  // 氏名検索
  document.getElementById('searchButton')
    .addEventListener('click', searchName);

  // Enterキーで氏名検索
  document.getElementById('nameInput')
    .addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        searchName();
      }
    });

  // 受付
  document.getElementById('receptionButton')
    .addEventListener('click', completeReception);

  // 戻る
  document.getElementById('backButton')
    .addEventListener('click', backHome);

  // 次の方の受付
  document.getElementById('nextButton')
    .addEventListener('click', backHome);

});
