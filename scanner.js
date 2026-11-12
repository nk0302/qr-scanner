
let qrScanner = null;
let cameraRunning = false;
let cameraStarting = false;
let qrLocked = false;

// カメラ起動の本体
async function startCameraInternal() {
  console.log('startCameraInternal() 実行');

  if (cameraRunning || cameraStarting || qrLocked) return;

  cameraStarting = true;

  const message = document.getElementById('cameraMessage');
  const status = document.getElementById('cameraStatus');

  try {
    message.textContent = 'カメラを起動しています...';
    status.textContent = '起動中';

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('カメラを利用できません。HTTPS接続を確認してください。');
    }

    if (!qrScanner) {
      qrScanner = new Html5Qrcode('reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      });
    }

    await qrScanner.start(
      { facingMode: 'user' },
      {
        fps: 10,
        qrbox: (width, height) => {
          const size = Math.floor(Math.min(width, height) * 0.7);
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
      'カメラを起動できませんでした。\n' + error.message;

    status.textContent = '起動失敗';

  } finally {
    cameraStarting = false;
  }
}

// 外部から呼び出す関数
window.startQrCamera = async function() {
  qrLocked = false;
  return startCameraInternal();
};

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

// ページ読み込み時に自動起動
window.addEventListener('load', () => {
  console.log('ページ読み込み完了：カメラを自動起動します。');
  window.startQrCamera();
});
