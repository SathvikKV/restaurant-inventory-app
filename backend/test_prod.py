import httpx
phone = '+17778889999'
r1 = httpx.post('https://kosh-api.sathvik-vadavatha.site/api/v1/auth/request-otp', json={'phone': phone})
otp = r1.json().get('mock_otp') or '123456'
r2 = httpx.post('https://kosh-api.sathvik-vadavatha.site/api/v1/auth/verify-otp', json={'phone': phone, 'otp': otp})
print('Verify OTP:', r2.status_code, r2.json())
