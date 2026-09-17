// Otázky pro Queen's Pub Kvíz #1 — přepsané z "QUEENS KVÍZ_01.pdf".
// correct: index (0 = A, 1 = B, 2 = C) správné odpovědi.

const ROUNDS = [
  {
    title: "Queens, který znáš",
    questions: [
      {
        text: "V jakém roce vznikl Queen's Pub?",
        options: ["2022", "2024", "2025"],
        correct: 1,
      },
      {
        text: "Kde se Queen's Pub nachází?",
        options: ["V pasáži Alfa", "V pasáži Typos", "V pasáži Rozkvět"],
        correct: 1,
      },
      {
        text: "Na jaké adrese Queen's Pub najdeš?",
        options: ["Běhounská 2/22", "Běhounská 22/2", "Česká 2/22"],
        correct: 0,
      },
      {
        text: "Které známé brněnské místo je podle Queensu jen pár kroků od podniku?",
        options: ["Moravské náměstí", "Zelný trh", "Jakubské náměstí"],
        correct: 2,
      },
      {
        text: "Co bylo v prostoru před Queen's Pubem?",
        options: [
          "Hospoda Tenkrát na západě",
          "Restaurace U Typosu",
          "Bar U Jakuba",
        ],
        correct: 0,
      },
      {
        text: "Co měl být Queen's Pub původně, ještě předtím, než vznikl současný koncept?",
        options: ["Vinárna", "Dýmkárna", "Jazzový klub"],
        correct: 1,
      },
      {
        text: "Proč se prostor pro Jaru stal důležitým už před vznikem Queen's Pubu?",
        options: [
          "Pracoval tam jako barman",
          "Poznal tam svou budoucí ženu Evu",
          "Chodil tam od dětství na pivo",
        ],
        correct: 1,
      },
      {
        text: "Kdo stojí za vznikem Queen's Pubu?",
        options: ["Jara a Evička", "Bob a Jenny", "Oksi a Jara"],
        correct: 0,
      },
      {
        text: "Jak by podle lidí z Queensu nejlépe šla popsat atmosféra podniku?",
        options: ["Luxusní a formální", "Rodinná a přátelská", "Tichá a komorní"],
        correct: 1,
      },
      {
        text: "Co najdeš jako součást výzdoby Queensu na zdech?",
        options: [
          "Staré filmové plakáty",
          "Fotky štamgastů a personálu",
          "Fotografie slavných britských kapel",
        ],
        correct: 1,
      },
      {
        text: "Která věta nejlépe vystihuje jednu z myšlenek Queensu?",
        options: [
          "Všechno zajímavé musí být vidět hned u vchodu.",
          "Ty nejzajímavější místa nejsou vždycky na první dobrou vidět.",
          "Nejlepší večery začínají vždy po půlnoci.",
        ],
        correct: 1,
      },
      {
        text: "Který z těchto programů najdeš v Queensu pravidelně?",
        options: ["Turbo Hodinu", "Filmový klub", "Šachový turnaj"],
        correct: 0,
      },
      {
        text: "Která aktivita se v Queensu pravidelně koná ve vybrané soboty?",
        options: ["Beer Pong", "Karaoke soutěž", "Pubová šipková liga"],
        correct: 0,
      },
      {
        text: "Co se podle aktuálního programu pravidelně objevuje v pátečním programu?",
        options: [
          "DJs a živá hudba",
          "Pouze sportovní přenosy",
          "Pouze Beer Pong",
        ],
        correct: 0,
      },
      {
        text: "Kolik piv a ciderů má Queens aktuálně na čepu?",
        options: ["4", "6", "8"],
        correct: 1,
      },
      {
        text: "Přibližně kolik lihovin a labelů Queens uvádí na svém webu?",
        options: ["100+", "150+", "250+"],
        correct: 2,
      },
      {
        text: "Kolik základních koktejlů Queens uvádí?",
        options: ["12", "8", "15"],
        correct: 1,
      },
      {
        text: "Jaké heslo nebo hlášku používá Queens jako typický pozdrav?",
        options: ["Nazdar kámo", "Hej bejbe", "Čau krásko"],
        correct: 1,
      },
      {
        text: "Který z těchto programů patří mezi pravidelné akce Queen's Pubu?",
        options: ["Večer na Ginu", "Wine Monday", "Whisky Tuesday"],
        correct: 0,
      },
      {
        text: "Který z těchto hudebních programů můžeš v Queensu pravidelně zažít?",
        options: [
          "Bára Kiršová & Martin Husovský",
          "Eva a Vašek",
          "Jara s Evičkou",
        ],
        correct: 0,
      },
    ],
  },
  {
    title: "Queens Lore",
    questions: [
      {
        text: "Kdo je „Náš Bob“?",
        options: [
          "Jeden z pravidelných DJs Queensu",
          "Člověk, díky kterému se Jara dozvěděl o uvolnění prostoru",
          "Bývalý majitel hospody Tenkrát na západě",
        ],
        correct: 1,
      },
      {
        text: "Kdo je Jenny?",
        options: [
          "Jarova dcera, která působila v Queensu jako obsluha",
          "Hlavní barmanka a provozní Queensu",
          "Jedna z pravidelných DJs",
        ],
        correct: 0,
      },
      {
        text: "Kdo je Oksi?",
        options: [
          "Jedna z majitelek Queensu",
          "Hlavní barmanka a provozní Queensu",
          "Pravidelná DJka Queensu",
        ],
        correct: 1,
      },
      {
        text: "Kdo pomohl Jarovi zjistit, že se prostor, kde dnes Queens stojí, uvolnil?",
        options: ["Jenny", "Náš Bob", "Oksi"],
        correct: 1,
      },
      {
        text: "Co bylo v plánu s prostorem ještě před vznikem Queen's Pubu?",
        options: [
          "Udělat z něj dýmkárnu",
          "Otevřít v něm restauraci",
          "Vybudovat hudební klub",
        ],
        correct: 0,
      },
      {
        text: "Která osoba je spojena s příběhem, proč má Queens pro Jaru osobní význam?",
        options: ["Jenny", "Eva", "Oksi"],
        correct: 1,
      },
      {
        text: "Jaká vlastnost nejlépe vystihuje Jaru?",
        options: ["Ambiciózní", "Velmi formální", "Samotářský"],
        correct: 0,
      },
      {
        text: "Jaká vlastnost nejlépe vystihuje Evičku?",
        options: [
          "Věčný srandista",
          "Přísný perfekcionista",
          "Velký znalec whisky",
        ],
        correct: 0,
      },
      {
        text: "Co je Queens Pub?",
        options: ["Anglicko, Irský pub", "Barokní hospoda", "Prestižní restaurace"],
        correct: 0,
      },
      {
        text: "Jaký typ člověka podle Queensu nejlépe zapadá do jeho atmosféry?",
        options: [
          "Pouze pravidelný štamgast",
          "Milý, vtipný a obyčejný člověk z davu",
          "Pouze fanoušek britské kultury",
        ],
        correct: 1,
      },
      {
        text: "Která z těchto kombinací nejlépe odpovídá tomu, co Queens nabízí?",
        options: [
          "Pití, hudba a zábava",
          "Sport, kasino a bowling",
          "Kino, divadlo a galerie",
        ],
        correct: 0,
      },
      {
        text: "Která z těchto akcí je spojena se středečním programem Queensu?",
        options: ["Turbo Středa", "Večer na Ginu", "Beer Pong"],
        correct: 0,
      },
      {
        text: "Která z akcí je v programu nejnovější?",
        options: ["Akční čtvrtek", "Turbo Hodina", "Beer Pong"],
        correct: 0,
      },
      {
        text: "Která z těchto aktivit je spojena se sobotním programem Queensu?",
        options: ["Beer Pong", "Turbo středa", "Akční čtvrtek"],
        correct: 0,
      },
      {
        text: "Která z těchto možností nejlépe vystihuje páteční program Queensu?",
        options: ["Bude dlouhá noc", "Nezáživný nudný večer", "Jsem tu omylem?"],
        correct: 0,
      },
      {
        text: "Který z těchto nápojů patří mezi typické drinky, které Queens uvádí ve své nabídce?",
        options: ["Hugo Spritz", "Moscow Mule", "Tom Collins"],
        correct: 0,
      },
      {
        text: "Který z těchto drinků je založený na kombinaci rumu, limety a coly?",
        options: ["Hugo Spritz", "Cuba Libre", "Espresso Martini"],
        correct: 1,
      },
      {
        text: "Který z těchto drinků patří mezi koktejly, které Queens uvádí ve své nabídce?",
        options: ["Espresso Martini", "Negroni", "Cosmopolitan"],
        correct: 0,
      },
      {
        text: "Která část Brna nejlépe vystihuje polohu Queensu?",
        options: ["Centrum Brna", "Brněnské výstaviště", "Okraj Brna"],
        correct: 0,
      },
      {
        text: "Které tvrzení nejlépe vystihuje Queen's Pub?",
        options: [
          "Místo v centru Brna, kde se potkává pití, hudba, zábava a rodinná atmosféra.",
          "Podnik zaměřený především na sportovní přenosy.",
          "Malý bar zaměřený výhradně na koktejly.",
        ],
        correct: 0,
      },
    ],
  },
];

module.exports = { ROUNDS };
