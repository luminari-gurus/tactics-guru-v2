"""Public isolated-fixture helpers extracted from the reviewed harnesses."""

import io, json, subprocess, tarfile

IMAGE = 'sha256:4a73073bd557c65b759505da037898b61f1be6cbcc3c2c3aeac22d2a470c1752'

def cli(*args, data=None):
    return subprocess.run(['docker', *args], input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True, timeout=20).stdout.decode().strip()

def inspect(kind, name):
    try: return json.loads(cli(kind, 'inspect', name))[0]
    except subprocess.CalledProcessError: return None

UBUNTU='sha256:3d97742a33529bb3d6a58cc8a6ba8d8fb834aa702d5cc804c78f5ddc0c161f60'

CONF=b'events {} http { client_body_temp_path /tmp/client; proxy_temp_path /tmp/proxy; fastcgi_temp_path /tmp/fastcgi; uwsgi_temp_path /tmp/uwsgi; scgi_temp_path /tmp/scgi; access_log off; server { listen 8080; root /usr/share/nginx/html; } }\npid /tmp/nginx.pid; error_log /dev/stderr;\n'

def archive(entries):
    out=io.BytesIO()
    with tarfile.open(fileobj=out,mode='w') as tf:
        for name,data,mode in entries:
            item=tarfile.TarInfo(name); item.size=len(data); item.mode=mode
            tf.addfile(item,io.BytesIO(data))
    return out.getvalue()
