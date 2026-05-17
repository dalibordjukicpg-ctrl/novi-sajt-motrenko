#!/usr/bin/env node
/**
 * Ispisuje korake za produkcijski deploy (Vercel 24/7 + cloud MySQL).
 * Pokretanje: npm run vercel:checklist
 */

const rows = `
================================================================================
DEPLOY NA VERCEL (radi kad je računar ugašen)
================================================================================

1) CLOUD MySQL  (obavezno — Vercel nema MySQL)
   - Napravi instancu kod provajdera (Hostinger, DigitalOcean, Aiven, vlastiti VPS + MariaDB, itd.).
   - Omogući „remote“ pristup ako provajder traži (whitelist IP / public host).
   - Kopiraj connection string: mysql://user:LOZINKA@host:3306/ime_baze
     (specijalni znakovi u lozinci → URL-encode u DATABASE_URL)

2) LOKALNO — migracije na TU bazu (jednom)
   U .env stavi isti DATABASE_URL kao što ćeš na Vercelu, zatim:
     npm run db:migrate
     npm run seed:site          (ako treba početni sadržaj)
     npm run seed:admin         (za admin prijavu; podesi SEED_* u .env)

3) GIT — kod mora biti na GitHub / GitLab / Bitbucket
   Ako još nemaš remote: na github.com napravi repo, pa:
     git remote add origin https://github.com/TVOJ_USER/TVOJ_REPO.git
     git add -A && git commit -m "Deploy ready"   (samo ako želiš commit)
     git push -u origin main

4) VERCEL — vercel.com → Add New Project → importuj repo
   Environment Variables (minimum):
     DATABASE_URL              = isti MySQL URL kao u koraku 2
     NEXT_PUBLIC_SITE_URL      = https://tvoj-projekt.vercel.app
                                 (nakon prvog deploya kopiraj tačan URL sa Vercela)

   Preporučeno (vidi .env.example):
     ANALYTICS_VISITOR_SALT — nasumičan dug niz
     RESEND_API_KEY / RESEND_FROM — ako želiš mejl sa kontakt forme

   Nakon što Vercel dodijeli URL, ažuriraj NEXT_PUBLIC_SITE_URL na taj URL
   i uradi Redeploy (Deployments → ... → Redeploy).

5) PROVJERA
     npm run build
   Lokalan build mora prolaziti. Na Vercelu u Build Logs gledaj greške.

================================================================================
Ovo ne može automatski iz repoa: login na Vercel/GitHub, kupovina hostinga,
unos DATABASE_URL u Vercel, kreiranje cloud MySQL naloga.
================================================================================
`;

// eslint-disable-next-line no-console -- CLI output
console.log(rows.trim());
