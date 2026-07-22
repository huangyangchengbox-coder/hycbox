/**
 * 发布图字段归一：优先 images，否则用 imageUrl 单图。
 */
function normalizePublicationImages(item) {
  if (!item) return item
  const images = (item.images && item.images.length)
    ? item.images.filter(Boolean)
    : (item.imageUrl ? [item.imageUrl] : [])
  return Object.assign({}, item, {
    images,
    imageUrl: images[0] || item.imageUrl || ''
  })
}

function normalizePublicationList(list) {
  return (list || []).map(normalizePublicationImages)
}

function previewPublicationImages(item, current) {
  const urls = (item && item.images && item.images.length)
    ? item.images
    : (item && item.imageUrl ? [item.imageUrl] : [])
  if (!urls.length) return
  wx.previewImage({
    urls,
    current: current || urls[0]
  })
}

module.exports = {
  normalizePublicationImages,
  normalizePublicationList,
  previewPublicationImages
}
