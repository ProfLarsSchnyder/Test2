# Marktstadt 3D, Das Spiel von Angebot und Nachfrage

Ein browserbasiertes 3D-Lernspiel für **Wirtschaft und Recht**. Du steuerst eine Figur durch mehrere Stadtzonen, handelst Waren, reagierst auf Marktereignisse und beantwortest Wirtschaftsfragen.

## Spielstart (ohne Installation)

1. Öffne dieses Repository lokal.
2. Doppelklicke auf `index.html`.
3. Klicke auf **Spiel starten**.

> Es ist **kein lokaler Server** nötig (kein localhost, kein npm, kein Build-Tool).
>
> Hinweis: Für das Laden von Three.js über CDN wird beim ersten Start Internet benötigt.

## Steuerung

- **WASD**: Bewegung
- **Maus**: Umschauen
- **E**: Interaktion mit Zonen
- **ESC**: Maus freigeben

## Zonen & Level

- **Level 1**: Bauernmarkt
- **Level 2**: Einkaufsstrasse
- **Level 3**: Elektronikviertel
- **Level 4**: Bank und Lagerhaus
- **Level 5**: Rathaus mit Abschlussprüfung

Die Bereiche werden über Questfortschritt und Vermögen freigeschaltet.

## Lernziele

Das Spiel macht die folgenden Konzepte erlebbar:

- Angebot und Nachfrage
- Gleichgewichtspreis und Marktgleichgewicht
- Knappheit
- Substitutions- und Komplementärgüter
- Preiselastizität
- Angebots- und Nachfrageverschiebung
- staatliche Eingriffe (Steuern, Subventionen)

## So funktionieren Angebot & Nachfrage im Spiel

Für jedes Produkt (`Äpfel`, `Brot`, `Kaffee`, `Smartphones`, `Fahrräder`, `Energie`) gibt es:

- einen Basispreis
- einen Angebotsfaktor
- einen Nachfragefaktor
- einen Elastizitätsfaktor

Der aktuelle Preis wird pro Runde dynamisch berechnet. Ereignisse verändern Angebot/Nachfrage (z. B. Ernteausfall, Energiekrise), was Preise steigen oder fallen lässt.

## Ereignisse (Beispiele)

- Ernteausfall bei Äpfeln
- Überproduktion bei Brot
- Social-Media-Hype bei Smartphones
- Energiekrise
- Rabattaktion der Konkurrenz
- Transportprobleme
- Neue Technologie senkt Produktionskosten
- Staatliche Subvention
- Steuererhöhung
- Streik im Lagerhaus

## Didaktischer Ansatz

Du lernst nicht nur durch Quizfragen, sondern vor allem durch Entscheidungen:

- günstig einkaufen und zeitversetzt verkaufen
- Lagerkapazität strategisch erweitern
- Kreditrisiken abwägen
- Ereignisse interpretieren und Marktreaktionen vorhersagen

## Spielumfang

- Grössere 3D-Welt mit mehreren Zonen
- Geldsystem, Punktesystem, Inventar
- 12 Quests
- 20+ Multiple-Choice-Fragen mit direktem Feedback
- Zeitverlauf mit Tag/Nacht und Runden

Viel Erfolg in Marktstadt 3D.
