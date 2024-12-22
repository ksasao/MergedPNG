// 画像ファイルパスを設定（結合された画像）
const combinedImagePath = 'combined_image.png';

const image1Canvas = document.getElementById('image1Canvas');
const elevationValue = document.getElementById('elevationValue');

const image1Context = image1Canvas.getContext('2d');
let image1, image2;

fetch(combinedImagePath)
    .then(response => response.arrayBuffer())
    .then(buffer => {
        const combinedData = new Uint8Array(buffer);
        const iendPos = findChunkEnd(combinedData);

        if (iendPos === -1) {
            console.error('IEND chunk not found.');
            return;
        }

        const image1Data = combinedData.slice(0, iendPos + 8); // IENDチャンク + 4バイトのCRC
        const image2Data = combinedData.slice(iendPos + 8);

        image1 = new Image();
        image2 = new Image();
        
        image1.src = URL.createObjectURL(new Blob([image1Data], { type: 'image/png' }));
        image2.src = URL.createObjectURL(new Blob([image2Data], { type: 'image/png' }));

        image1.onload = () => {
            image1Canvas.width = image1.width;
            image1Canvas.height = image1.height;
            image1Context.drawImage(image1, 0, 0);
        };
    })
    .catch(error => console.error('Error loading combined image:', error));

// マウスムーブイベントを処理
image1Canvas.addEventListener('mousemove', async (event) => {
    if (!image2) return;
    
    const rect = image1Canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (x >= 0 && x < image1Canvas.width && y >= 0 && y < image1Canvas.height) {
        const elevation = await getElevationAtPoint(image2, x, y);
        elevationValue.textContent = `Elevation: ${elevation.toFixed(2)} (m)`;
    }
});

// 指定したポイントの標高を取得
async function getElevationAtPoint(image, x, y) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = image.width;
    tempCanvas.height = image.height;
    const tempContext = tempCanvas.getContext('2d');
    tempContext.drawImage(image, 0, 0);

    const imageData = tempContext.getImageData(x, y, 1, 1).data;
    const [R, G, B] = imageData;

    let elevation = ((R << 16) + (G << 8) + B);
    if ((R & 128) > 0) {
        elevation = (elevation - (2 << 23));
    }
    return elevation * 0.01;
}

// PNGファイルのIENDチャンクを見つける関数
function findChunkEnd(data) {
    const iendChunk = new Uint8Array([0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]); // IENDチャンク + 4バイトのCRC
    for (let i = 0; i < data.length - iendChunk.length; i++) {
        let match = true;
        for (let j = 0; j < iendChunk.length; j++) {
            if (data[i + j] !== iendChunk[j]) {
                match = false;
                break;
            }
        }
        if (match) {
            console.log(`IEND chunk found at position: ${i}`);
            return i;
        }
    }
    return -1;
}
