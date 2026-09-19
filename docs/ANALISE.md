# Análise do Improved Initiative e implementação do RoundKeep

Inspeção em 18 de setembro de 2026. Referência: https://improvedinitiative.app/e/.

## Evidências consultadas

- HTML servido pela produção: pacote `/js/ImprovedInitiative.3.17.1.js` (2.109.232 bytes), CSS versionado, manifest e configuração `environmentJSON` com contexto de encontro e estado de autenticação.
- Bundle público de produção: confirma LocalForage, IndexedDB, armazenamento legado, carregamento de fontes Open5e e Socket.IO. Não foi localizada referência a `serviceWorker` nesse bundle.
- Repositório público https://github.com/cynicaloptimist/improved-initiative, branch `development`, cujo `package.json` indicava 3.17.2. Essa branch não é idêntica ao build 3.17.1 em produção; os achados de código são diferenciados dos endpoints efetivamente consultados.
- Interface real da aba aberta no Chrome: biblioteca, criaturas personalizadas, personagens, controles de encontro, configurações e exportação de dados locais.
- Exportação feita pela própria interface, em Settings → Account → Export. Backup completo preservado em `private-data/improved-initiative.json`, fora do Git e do build.
- GET real de `/open5e/`: HTTP 200, JSON com 10 fontes de criaturas e 8 fontes de magias; `cache-control: private`, `cf-cache-status: DYNAMIC`, `ETag` presente.
- GET real de `https://api.open5e.com/v2/creatures/?document__key=srd-2024&limit=1000`: 331 registros, sem página seguinte.

Não foi feita uma captura HAR exaustiva de todas as ações nem acesso ao banco de dados do servidor. O relatório não confunde inspeção de código com tráfego observado.

## Arquitetura observada

O frontend original combina React, Knockout, TypeScript, LESS e Webpack. O backend público usa Express; os módulos do repositório incluem MongoDB para contas e Redis opcional para sessões e distribuição Socket.IO. A configuração de infraestrutura efetivamente usada em produção não é pública.

| Rota ou transporte                                          | Função encontrada no código                                                                              |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `GET /statblocks/`, `/statblocks/:id`                       | Índice de criaturas básicas e ficha individual                                                           |
| `GET /spells/`, `/spells/:id`                               | Índice e ficha de magia                                                                                  |
| `GET /open5e/`                                              | Fontes habilitáveis de criaturas e magias; resposta verificada                                           |
| `GET /open5e/:fonte/`                                       | Metadados de criaturas agrupados por documento                                                           |
| `GET /open5e-spells/:fonte/`                                | Metadados de magias por documento                                                                        |
| Open5e `/v2/creatures/:key/`, `/v1/spells/:slug/`           | Detalhes remotos, solicitados quando a ficha é usada                                                     |
| `/my`, `/my/fullaccount`, `/my/settings`, `/my/:tipo/`      | Conta, configurações e sincronização autenticada                                                         |
| `GET /playerviews/:id`                                      | Estado inicial da visão dos jogadores                                                                    |
| Socket.IO                                                   | `join encounter`, `update encounter`, `encounter updated`, `update settings`, sugestões de dano/condição |
| `/importencounter/`, `/launchencounter/`, `/encounterfrom/` | Importação e abertura de encontros                                                                       |

Arquivos relevantes: `client/Library/Listing.ts`, `client/Library/Libraries.ts`, `client/Utility/Store.ts`, `client/Utility/LegacySynchronousLocalStore.ts`, `client/Combatant/Combatant.ts`, `server/configureOpen5eContent.ts`, `server/configureBasicRulesContent.ts`, `server/storageroutes.ts`, `server/sockets.ts`.

## Cache não é uma única camada

1. **Memória do servidor:** índices Open5e são carregados e agrupados por fonte na inicialização.
2. **Memória da página:** `Listing` guarda a ficha já carregada em um observable; isso evita novas consultas naquela instância, mas não garante persistência offline.
3. **LocalForage:** bancos `Creatures`, `Spells`, `PersistentCharacters` e `SavedEncounters` usam IndexedDB, com mecanismos de fallback da biblioteca.
4. **localStorage legado:** chaves `ImprovedInitiative.*` incluem preferências, índices e autosave do encontro.
5. **HTTP/CDN:** o endpoint de fontes observado usa cache privado e ETag; não foi servido como cache público de CDN nessa requisição.

A exportação pessoal continha 9 criaturas e 4 personagens persistentes. O encontro autosalvo estava vazio. A fonte de criaturas habilitada era `srd-2024`; a de magias, `wotc-srd`. Não havia magias pessoais nem encontros salvos com combatentes no snapshot.

O backup original permanece integral, inclusive configurações e campos que não possuem controle equivalente no novo produto. A migração para controles novos não significa equivalência de todas as preferências antigas.

## Implementação entregue

O RoundKeep tem frontend TypeScript próprio, Vite e ícones Lucide. O backend local Node serve o build, fornece o bootstrap privado somente em loopback e oferece ETags para arquivos. O combate não depende de chamadas remotas durante a sessão.

- 331 criaturas SRD 2024 via Open5e, com ações, ações bônus, reações, ações lendárias, salvaguardas, perícias e defesas.
- 319 magias do catálogo básico distribuído pelo Improved Initiative.
- Biblioteca pessoal importada; campos e textos das fichas preservados. Bônus de iniciativa convertido: o original soma modificador de Destreza e bônus adicional; o modelo novo guarda o bônus total.
- Pesquisa sem distinção de acentos, filtro por origem, fichas detalhadas, criação/edição de criaturas e magias, editor de ações e atributos.
- Turnos e rodadas, iniciativa editável, rolagem, PV temporários antes do dano, cura limitada ao máximo, condições, reação, ocultação e duplicação.
- Histórico, desfazer ações do encontro, notas privadas, encontros salvos, importação validada com revisão, backup exportável e preservação do original.
- IndexedDB `roundkeep`, store `data`: `state`, catálogo versionado e snapshot `before-import`. Migração automática de bancos legados `patron`.
- Service worker de produção: shell, assets locais e catálogos. A versão do cache é derivada do build e dos catálogos. O endpoint privado `/api/bootstrap` nunca entra no cache do service worker.
- Visão de jogadores por BroadcastChannel no mesmo navegador/dispositivo; apenas projeção pública do encontro é enviada.

A UI mantém a biblioteca, a ordem de combate e a ficha em áreas distintas. Nomes de ações ficam explícitos, há foco visível, diálogos nativos, contraste por estado e layout adaptado a celular.

## Limites explícitos

- Não inclui autenticação Patreon, sincronização de conta em nuvem ou sala remota multiusuário. A visão dos jogadores é local.
- Conteúdo de regras preserva o idioma da fonte; a interface está em português.
- Condições são marcadores manuais; não há expiração automática por rodada nem motor que aplique regras de todas as condições.
- O catálogo offline é uma fotografia da fonte na data da análise. Não baixa automaticamente todos os livros adicionais do Open5e.
- O importador suporta os tipos presentes no backup observado e backups no esquema documentado; exportações XML/DnDAppFile não são suportadas.
- Configurações originais e campos sem equivalente permanecem no backup integral; não são executados automaticamente.
- A visão dos jogadores oculta dados na apresentação, mas não constitui uma fronteira de segurança entre pessoas que compartilham o mesmo perfil do navegador.

## Verificação realizada

- Build TypeScript + Vite de produção.
- 11 testes automatizados: PV, cura, temporários, turno/rodada, empates, remoção ativa, dados, validação de importações, catálogo completo, preservação das fichas pessoais e exclusão do backup do build.
- Chrome real: biblioteca importada, adição dos quatro heróis e de uma criatura personalizada, início do combate, dano de 15 reduzindo 112 → 97, marcador Envenenado e persistência de ambos após recarregar.
- Visão dos jogadores: estado público correto e mudança de turno sincronizada para Underfoot; notas, CA e PV exatos não aparecem.
- Servidor encerrado: recarregamento por service worker manteve a aplicação e o encontro acessíveis, com estado salvo.
- Layout de desktop e viewport móvel de 390 px inspecionados visualmente. Console observado sem mensagens visíveis; não é garantia de ausência absoluta de bugs.

### Conferência final de entrega

- Exportação real `roundkeep-backup.json` baixada pelo navegador e validada pelo modelo. O campo `sourceBackup` é idêntico ao backup original; cópia adicional em `private-data/roundkeep-verified-backup.json`.
- Encontro `Vallaki - demo` salvo, em preparação, com 4 aliados e 1 adversário. Dano e condição introduzidos nos testes foram removidos; os PV foram restaurados.
- Bootstrap HTTP local comparado ao arquivo original: conteúdo idêntico, `Cache-Control: no-store`. Catálogo servido com 331 registros e ETag.
- Fontes DM Sans e Manrope incluídas no build e na lista de pré-cache; não há dependência de Google Fonts em tempo de execução.
- Proteção Web Locks verificada em duas abas reais: a primeira mantém a edição e a segunda informa que a mesa já está aberta, sem sobrescrever dados. A visão dos jogadores continua disponível em paralelo.
