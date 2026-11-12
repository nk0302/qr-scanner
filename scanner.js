
let qrScanner = null;
let cameraRunning = false;
let qrLocked = false;

/**
 * カメラ起動
 */
async function startQrCamera() {
  if (cameraRunning || qrLocked) return;

  const message = document.getElementById('cameraMessage');
  const status = document.getElementById('cameraStatus');
  const restartButton =
    document.getElementById('restartCameraButton');

  message.textContent = 'カメラを起動しています...';
  status.textContent = '起動中';
  status.classList.remove('active');
  restartButton.classList.add('hidden');

  try {
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
        qrbox: function(width, height) {
          const size = Math.floor(
            Math.min(width, height) * 0.7
          );

          return {
            width: size,
            height: size
          };
        },
        aspectRatio: 16 / 9
      },
      onQrDetected
    );

    cameraRunning = true;

    message.textContent =
      'QRコードをカメラにかざしてください。';

    status.textContent = '読み取り中';
    status.classList.add('active');

  } catch (error) {
    console.error('Camera error:', error);

    message.textContent =
      'カメラを起動できませんでした。\n' +
      'ブラウザのカメラ使用許可を確認してください。\n' +
      'エラー：' + error.message;

    status.textContent = '停止中';

    restartButton.classList.remove('hidden');
  }
}

/**
 * QRコード読み取り成功
 */
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

/**
 * カメラ停止
 */
async function stopQrCamera() {
  if (!qrScanner || !cameraRunning) return;

  try {
    await qrScanner.stop();
  } catch (error) {
    console.error('Camera stop error:', error);
  }

  cameraRunning = false;
}

/**
 * カメラ再起動
 */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('restartCameraButton')
    .addEventListener('click', () => {
      qrLocked = false;
      startQrCamera();
    });

  // ページ表示時に自動起動
  startQrCamera();
});

// script.jsから呼び出すために公開
window.startQrCamera = async function() {
  qrLocked = false;

  if (cameraRunning) return;

  await startQrCamera();
};
