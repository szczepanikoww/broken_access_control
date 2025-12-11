import base64
import string

def base62_encode(data):
    alphabet = string.digits + string.ascii_uppercase + string.ascii_lowercase
    if isinstance(data, str):
        data = data.encode()
    num = int.from_bytes(data, 'big')
    if num == 0:
        return alphabet[0]
    arr = []
    base = len(alphabet)
    while num:
        num, rem = divmod(num, base)
        arr.append(alphabet[rem])
    return ''.join(reversed(arr))

def base58_encode(data):
    alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    if isinstance(data, str):
        data = data.encode()
    num = int.from_bytes(data, 'big')
    if num == 0:
        return alphabet[0]
    arr = []
    base = len(alphabet)
    while num:
        num, rem = divmod(num, base)
        arr.append(alphabet[rem])
    return ''.join(reversed(arr))

def base36_encode(data):
    # Standard 0-9a-z
    alphabet = string.digits + string.ascii_lowercase
    if isinstance(data, str):
        data = data.encode()
    num = int.from_bytes(data, 'big')
    if num == 0:
        return alphabet[0]
    arr = []
    base = len(alphabet)
    while num:
        num, rem = divmod(num, base)
        arr.append(alphabet[rem])
    return ''.join(reversed(arr))

def base2_encode(data):
    if isinstance(data, str):
        data = data.encode()
    return ''.join(format(byte, '08b') for byte in data)

flags = [
    ("QWERTY", "Base64"),
    ("AZERTY", "Base32"),
    ("DVORAK", "Base16"),
    ("COLEMAK", "Base85"),
    ("QWERTZ", "Base58"),
    ("WORKMAN", "Base62"),
    ("MALTRON", "Base2")
]

results = []

for layout, enc_type in flags:
    text = f"flag={{{layout}}}"
    b_text = text.encode('utf-8')
    
    encoded = ""
    if enc_type == "Base64":
        encoded = base64.b64encode(b_text).decode()
    elif enc_type == "Base32":
        encoded = base64.b32encode(b_text).decode()
    elif enc_type == "Base16":
        encoded = base64.b16encode(b_text).decode()
    elif enc_type == "Base85":
        encoded = base64.b85encode(b_text).decode()
    elif enc_type == "Base58":
        encoded = base58_encode(b_text)
    elif enc_type == "Base62":
        encoded = base62_encode(b_text)
    elif enc_type == "Base2":
        encoded = base2_encode(b_text)
        
    results.append(f"Layout: {layout}\nEncoding: {enc_type}\nResult: {encoded}\n")

print("\n".join(results))