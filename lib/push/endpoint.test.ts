import { describe, expect, it } from 'vitest'
import { endpointPushValido } from './endpoint'

describe('endereço de push', () => {
  it('aceita os serviços dos navegadores', () => {
    expect(endpointPushValido('https://fcm.googleapis.com/fcm/send/abc')).toBe(true)
    expect(endpointPushValido('https://web.push.apple.com/QGx')).toBe(true)
    expect(endpointPushValido('https://updates.push.services.mozilla.com/wpush/v2/x')).toBe(true)
    expect(endpointPushValido('https://wns2-bl2p.notify.windows.com/w/?token=x')).toBe(true)
  })
  it('recusa qualquer outro endereço', () => {
    expect(endpointPushValido('https://exemplo.com/push')).toBe(false)
    expect(endpointPushValido('http://fcm.googleapis.com/x')).toBe(false)
    expect(endpointPushValido('https://fcm.googleapis.com.evil.com/x')).toBe(false)
    expect(endpointPushValido('javascript:alert(1)')).toBe(false)
  })
})
