import os
D=os.path.dirname(os.path.abspath(__file__))
r=lambda f:open(os.path.join(D,f)).read()
logo=r('logo.b64').strip(); noo=r('noo.b64').strip()
head='''<title>NOETIS · A new place for people who pay attention</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="theme-color" content="#f6e7c1">
<meta name="description" content="A new place for people who pay attention. Be among the first to know when NOETIS opens its eyes.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='22' fill='%23F6E7C1'/%3E%3Ccircle cx='50' cy='50' r='38' fill='none' stroke='%23050505' stroke-width='7'/%3E%3Cpath d='M20 50 Q50 18 80 50 Q50 82 20 50Z' fill='%23fffaee' stroke='%23050505' stroke-width='6'/%3E%3Ccircle cx='50' cy='50' r='12' fill='%23050505'/%3E%3C/svg%3E">
<meta property="og:type" content="website">
<meta property="og:site_name" content="NOETIS">
<meta property="og:title" content="NOETIS · Everyone’s looking. Not everyone notices.">
<meta property="og:description" content="A new place for people who pay attention. Be among the first to know when NOETIS opens its eyes.">
<link rel="canonical" href="https://noetis.in/">
<meta property="og:url" content="https://noetis.in/">
<meta property="og:image" content="https://noetis.in/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="A flat black cartoon eye on butter yellow.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="NOETIS · Everyone’s looking. Not everyone notices.">
<meta name="twitter:description" content="A new place for people who pay attention.">
<meta name="twitter:image" content="https://noetis.in/og.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,500;1,500&family=JetBrains+Mono:wght@500&family=Syncopate:wght@400;700&display=swap">
'''
out=head+'<style>\n'+r('style.css')+'</style>\n'+r('body.html').replace('__LOGO__',logo).replace('__NOO__',noo)+'<script>\n'+r('app.js')+'</script>\n'
k=out.index('<a class="skip-link"')
open(os.path.join(D,'..','index.html'),'w').write('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'+out[:k]+'</head>\n<body>\n'+out[k:]+'</body>\n</html>\n')
print(len(out))
