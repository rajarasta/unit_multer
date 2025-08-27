export const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B","KB","MB","GB","TB","PB","EB","ZB","YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return ${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ;
};

export const readDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });

export const generateThumbnail = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 220;
        let { width, height } = img;
        if (width > height && width > MAX) { height *= MAX / width; width = MAX; }
        else if (height > MAX) { width *= MAX / height; height = MAX; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.65));
      };
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });

export const processFiles = async (files) => {
  const out = [];
  for (const file of files) {
    try {
      const isImage = file.type?.startsWith("image/") ?? false;
      const dataUrl = await readDataUrl(file);
      const thumbnailUrl = isImage ? await generateThumbnail(file) : null;
      out.push({
        id: doc--,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: formatBytes(file.size || 0),
        uploadDate: new Date().toLocaleString(),
        isImage,
        dataUrl,
        thumbnailUrl,
        comment: "",
        metadata: {
          location: null,
          captureTime: file.lastModified ? new Date(file.lastModified).toLocaleString() : null,
        },
      });
    } catch (e) {
      console.error("File processing error:", e);
    }
  }
  return out;
};

export const deepClone = (x) => JSON.parse(JSON.stringify(x));
