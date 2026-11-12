
let qrScanner = null;
let cameraRunning = false;
let cameraStarting = false;
let qrLocked = false;

// カメラ起動
async function startQrCamera() {
  if (cameraRunning || cameraStarting || qrLocked) return;

  cameraStarting = true;

  const message = document.getElementById('cameraMessage');
  const status = document.getElementById('cameraStatus');

  try {
    message.textContent = 'カメラを起動しています...';
    status.textContent = '起動中';

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('このブラウザではカメラを利用できません。HTTPS接続を確認してください。');
    }

    if (!qrScanner) {
      qrScanner = new Html5Qrcode('reader', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        verbose: false
      });
    }

    await qrScanner.start(
      { facingMode: 'user' },
      {
        fps: 10,
        qrbox: (width, height) => {
          const size = Math.floor(
            Math.min(width, height) * 0.7
          );
          return { width: size, height: size };
        }
      },
      onQrDetected
    );

    cameraRunning = true;
    message.textContent = 'QRコードをカメラにかざしてください。';
    status.textContent = '読み取り中';
    status.classList.add('active');

  } catch (error) {
    console.error('Camera error:', error);

    message.textContent =
      'カメラを起動できませんでした。\n' +
      'ブラウザのカメラ使用許可を確認してください。\n' +
      error.message;

    status.textContent = '起動失敗';

  } finally {
    cameraStarting = false;
  }
}

// QRコード読み取り
async function onQrDetected(decodedText) {
  if (qrLocked) return;

  const id = String(decodedText).trim();

  if (!/^\d+$/.test(id)) {
    document.getElementById('cameraMessage').textContent =
      '数字のみのIDではありません。';
    return;
  }

  qrLocked = true;

  document.getElementById('cameraMessage').textContent =
    'QRコードを読み取りました。';

  document.getElementById('cameraStatus').textContent =
    '読み取り完了';

  await stopQrCamera();

  searchId(id, 'QRコード');
}

// カメラ停止
async function stopQrCamera() {
  if (!qrScanner || !cameraRunning) return;

  try {
    await qrScanner.stop();
  } catch (error) {
    console.error(error);
  }

  cameraRunning = false;
}

console.log('scanner.js 読み込み完了');

window.addEventListener('load', () => {
  console.log('loadイベント実行');

  const message = document.getElementById('cameraMessage');
  message.textContent = 'カメラ起動関数を実行しています...';

  window.startQrCamera();
});
