
let qrScanner = null;
let cameraRunning = false;
let qrLocked = false;
let cameraStarting = false;

/**
 * カメラ起動
 */
async function startQrCamera() {

  if (cameraRunning || cameraStarting || qrLocked) {
    return;
  }

  cameraStarting = true;

  const message = document.getElementById('cameraMessage');
  const status = document.getElementById('cameraStatus');

  message.textContent = 'カメラを起動しています...';
  status.textContent = '起動中';

  try {

    if (!qrScanner) {
      qrScanner = new Html5Qrcode('reader', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        verbose: false
      });
    }

    // 内カメラを優先して起動
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
        }
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
      error.message;

    status.textContent = '起動失敗';

  } finally {
    cameraStarting = false;
  }
}

/**
 * QRコード読み取り
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
    console.error(error);
  }

  cameraRunning = false;
}

/**
 * カメラ再起動
 */
window.startQrCamera = async function() {

  qrLocked = false;

  if (cameraRunning || cameraStarting) return;

  await startQrCamera();
};

/**
 * ページ読み込み完了後、自動起動
 */
window.addEventListener('DOMContentLoaded', () => {
  startQrCamera();
});
