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
  previewUrls(urls, current)
}

function previewUrls(urls, current) {
  const list = (urls || []).filter(Boolean)
  if (!list.length) return
  wx.previewImage({
    urls: list,
    current: current || list[0]
  })
}

module.exports = {
  normalizePublicationImages,
  normalizePublicationList,
  previewPublicationImages,
  previewUrls
}
