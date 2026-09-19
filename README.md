# RoundKeep

**Domine a rodada. Comande o combate.** _Master the round. Run the combat._

RoundKeep é uma mesa de combate tática para D&D 5e que roda localmente no navegador. Organize iniciativa, gerencie PV e condições, consulte criaturas e magias do SRD offline e importe sua campanha do Improved Initiative — sem conta, sem nuvem e sem depender de internet durante a sessão.

## O que faz

- **Mesa de combate** com turnos, rodadas, iniciativa editável, dano/cura e condições
- **Biblioteca offline** com 331 criaturas SRD 2024 e 319 magias, prontas para consulta
- **Importação** de backups do Improved Initiative e do próprio RoundKeep, com revisão antes de confirmar
- **Visão dos jogadores** sincronizada localmente no mesmo navegador
- **Modo offline** via service worker após o primeiro carregamento
- **Backups portáveis** em JSON para levar sua campanha a outro dispositivo

## Rodar

```sh
npm install
npm run build
npm start
```

Abra **http://localhost:5173**. O servidor escuta somente em `127.0.0.1`.

Para desenvolver: `npm run dev`. Para verificar: `npm test` e `npm run build`.

O modo offline com service worker é ativado no build de produção, após o primeiro carregamento bem-sucedido. Os catálogos ficam em IndexedDB; o encontro é salvo a cada alteração. A limpeza de dados do navegador remove esse armazenamento, por isso use **Dados e configurações → Exportar backup** para cópias portáveis.

## Sua campanha

O backup extraído da aba original está em `private-data/improved-initiative.json`. A pasta é ignorada pelo Git e não é copiada para `dist`. Na primeira abertura, o servidor local fornece esse backup para importar as fichas pessoais. Se o arquivo não existir, a aplicação abre com o catálogo público e uma mesa vazia.

Exportações posteriores do Improved Initiative podem ser importadas pela interface. A importação apresenta uma revisão antes da confirmação. O arquivo de origem é preservado integralmente e pode ser baixado novamente.

**Dados e configurações** permite importar/exportar. **Encontros salvos** guarda preparações de combate. **Visão dos jogadores** abre uma janela sincronizada localmente neste navegador; não cria uma sala remota.

## Atalhos

- `N`: próximo turno.
- `/`: buscar na biblioteca.
- `D`: rolar dados.
- `Ctrl/⌘ + Z`: desfazer ação do encontro.

Clique no valor da iniciativa para editar. Clique nos PV para dano, cura ou vida temporária. Selecione o nome para consultar a ficha e condições.

## Organização

- `src/model.ts`: regras do encontro, importação e validação.
- `src/storage.ts`: IndexedDB e cache do catálogo.
- `src/main.ts`: interface e fluxos.
- `src/style.css`: design responsivo.
- `server.mjs`: servidor HTTP local e bootstrap privado.
- `public/data`: catálogo público offline.
- `scripts/convert-open5e.py`: conversão reprodutível de resposta completa Open5e v2.
- `scripts/build-sw.mjs`: versionamento automático do cache de produção.
- `tests`: testes de regras, dados e importação.
- [Análise da referência e evidências](docs/ANALISE.md).

Os registros de criaturas são do SRD 5.2 (2024), via Open5e, sob CC BY 4.0; as magias vêm do catálogo básico do Improved Initiative. Créditos e licenças estão em `public/credits.html`, `public/SRD-OGL_V1.1.pdf` e `docs/UPSTREAM-LICENSE.txt`.

Uma única aba de mestre edita a campanha por vez nos navegadores com Web Locks, evitando sobrescritas entre abas. As janelas de jogadores podem permanecer abertas em paralelo. As fontes também são locais e entram no pré-cache de produção.
