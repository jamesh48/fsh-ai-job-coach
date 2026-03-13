const STORAGE_KEY = 'printerDeviceId'

export function getDeviceId(device: USBDevice): string {
  const base = `${device.vendorId}:${device.productId}`
  return device.serialNumber ? `${base}:${device.serialNumber}` : base
}

export function getDeviceLabel(device: USBDevice): string {
  return (
    [device.manufacturerName, device.productName].filter(Boolean).join(' ') ||
    `Device ${device.vendorId.toString(16)}:${device.productId.toString(16)}`
  )
}

export function loadSavedPrinterId(): string {
  return localStorage.getItem(STORAGE_KEY) ?? ''
}

export function savePrinterId(id: string) {
  localStorage.setItem(STORAGE_KEY, id)
}
