# zFLY

Comparador de voos com identidade visual inspirada em Liquid Glass e Material Design 3. Pesquisa de aeroportos nacionais e internacionais, comparação demonstrativa e consulta opcional de tarifas reais.

## Funcionalidades

- Busca de aeroportos por cidade, nome ou código IATA, incluindo Maringá (MGF), com tolerância a acentos.
- Catálogo local de contingência e atualização via [OurAirports](https://ourairports.com/data/), restrita a aeroportos com serviço regular e IATA; cache de sete dias no navegador.
- Ida, ida e volta e múltiplos destinos; filtros, comparação e datas flexíveis no modo demonstrativo.
- Interface responsiva, temas claro/escuro, transparência opcional, animações SVG com respeito a `prefers-reduced-motion` e navegação por teclado.
- Consulta externa via Google e painel separado de ofertas reais Duffel, quando o servidor estiver configurado.

## Arquitetura

```text
zFLY/
├── index.html         # Interface, CSS, JavaScript e módulos de pesquisa
├── api/
│   └── flights.js     # Endpoint Node.js para ofertas reais Duffel
└── README.md         # Documentação e configuração
```

| Módulo | Responsabilidade |
| --- | --- |
| I18N / Formatters | Traduções, formatação e sanitização |
| AirportCatalog | Catálogo local, atualização, cache, busca e distâncias |
| ProviderAdapters | Simulação local e metadados das integrações |
| SearchService / FilterSortEngine | Pesquisa e filtros demonstrativos |
| UIRenderer / AppController | Interface, eventos e consulta real independente |
| api/flights.js | Validação e comunicação autenticada com a Duffel |

## Executar

### Modo estático

Sirva a pasta por HTTP local (por exemplo, `python -m http.server 8000`) e abra `http://localhost:8000`. O catálogo local e a demonstração não precisam de chave. A atualização do catálogo e as fontes externas dependem da conexão à internet. GitHub Pages pode servir a interface, mas não executa a função Node.js.

### Modo com tarifas reais

Use um ambiente de hospedagem que execute a função Node.js em `POST /api/flights`, como Vercel. Configure as variáveis de ambiente **somente no servidor**:

| Variável | Finalidade |
| --- | --- |
| `DUFFEL_ACCESS_TOKEN` | Token de produção da Duffel |
| `ZFLY_LIVE_ENABLED` | Defina `true` somente após configurar proteção contra abuso e validar a integração |

Antes de habilitar o endpoint publicamente, configure limitação de requisições no gateway/WAF e proteção contra abuso, confira custos e limites do provedor e teste em ambiente controlado. Nunca publique tokens no HTML, em commits ou logs.

A consulta real aceita adultos, até cinco trechos, e preserva a moeda original da oferta. Crianças e bebês precisam de uma integração que capture idade; use a pesquisa externa nesses casos. Não efetua reservas ou pagamentos. Respostas de teste são rejeitadas; nenhum valor simulado é exibido no painel real.

## Fontes e transparência

| Fonte | Estado |
| --- | --- |
| OurAirports | Catálogo aberto, atualização com fallback local |
| Catálogo demonstrativo | Simulação, sem disponibilidade ou preço comercial garantidos |
| [Duffel](https://duffel.com/docs/api/v2/offer-requests) | Código integrado; requer credenciais de produção, hospedagem e validação ao vivo |
| Google | Pesquisa externa, não é integração de API de preços |
| Amadeus / Kiwi | Integrações pendentes de configuração e implementação |

Os valores e conversões cambiais do modo demonstrativo são ilustrativos. Resultados reais dependem do provedor e podem mudar até a confirmação.

## Validação

Verifique buscas por `Maringá`, `maringa`, `MGF` e `CNF`; ausência de conexão; mudança de idioma; navegação por teclado; modo de movimento reduzido; e estados HTTP da função. Com o endpoint desativado, a interface deve informar indisponibilidade e manter a opção de pesquisa externa.

## Repositório

[github.com/jarodofc/zFLY](https://github.com/jarodofc/zFLY)
