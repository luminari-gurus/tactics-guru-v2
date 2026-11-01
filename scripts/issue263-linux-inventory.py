import hashlib,json,pathlib,platform,subprocess,sys
result={'kernel':platform.release(),'libraries':[],'memory':{}}
root=pathlib.Path.home()/'.cache/ms-playwright/webkit-2359'
for file in root.rglob('libsoup-3.0.so.*'):
 if file.is_symlink():continue
 strings=subprocess.check_output(['strings','-a',str(file)],text=True)
 result['libraries'].append({'file':str(file.relative_to(root)),'sha256':hashlib.file_digest(file.open('rb'),'sha256').hexdigest(),'versions':[line for line in strings.splitlines() if line.startswith('libsoup/')]})
for name in ['memory.events','memory.current','memory.max']:
 try:result['memory'][name]=(pathlib.Path('/sys/fs/cgroup')/name).read_text().strip()
 except OSError:result['memory'][name]=None
pathlib.Path(sys.argv[1]).write_text(json.dumps(result,indent=2)+'\n')
