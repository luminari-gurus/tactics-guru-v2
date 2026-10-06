FROM python:3.13-alpine@sha256:2d9aefe2fef018a7eb2c13064c89c71929800fd2e5dccdbf52ea5da5bb8d929a
WORKDIR /app
COPY release.py receiver.py /app/
USER 10001:10001
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
ENTRYPOINT ["python3", "/app/receiver.py"]
CMD ["--root", "/deploy", "--key-file", "/run/secrets/deploy-key", "--origin", "http://127.0.0.1:9122", "--port", "9123"]
