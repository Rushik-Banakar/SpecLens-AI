import urllib.request, json, os

pdf_path = 'uploads/RAG.pdf'
url = 'http://127.0.0.1:8000/api/upload'
boundary = '----FormBoundaryXYZ456'

with open(pdf_path, 'rb') as f:
    file_data = f.read()

print(f'File size: {len(file_data)} bytes')

header = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="files"; filename="RAG.pdf"\r\n'
    f'Content-Type: application/pdf\r\n\r\n'
).encode('utf-8')

footer = f'\r\n--{boundary}--\r\n'.encode('utf-8')
body = header + file_data + footer

req = urllib.request.Request(
    url,
    data=body,
    headers={
        'Content-Type': f'multipart/form-data; boundary={boundary}',
        'Origin': 'http://localhost:5173'
    },
    method='POST'
)

try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read())
        print('SUCCESS:', json.dumps(result, indent=2))
except urllib.error.HTTPError as e:
    print(f'HTTP ERROR {e.code}:')
    body_err = e.read().decode('utf-8', errors='replace')
    print(body_err)
except Exception as e:
    print(f'EXCEPTION: {type(e).__name__}: {e}')
    import traceback
    traceback.print_exc()
