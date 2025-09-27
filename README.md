# GuardianAI - KI-Sicherheitsschicht

GuardianAI ist ein System, das als Sicherheitsschicht für den Einsatz von KI in Unternehmensumgebungen dient. Es verwendet ein Retrieval-Augmented Generation (RAG)-System, um die Ausgaben eines primären KI-Modells anhand eines Satzes von Unternehmensrichtlinien zu bewerten.

## Funktionsweise

1.  Ein Mitarbeiter stellt eine Anfrage an ein primäres, leistungsstarkes KI-Modell.
2.  Das KI-Modell generiert eine Antwort.
3.  Diese Antwort wird an das GuardianAI-System weitergeleitet, bevor sie dem Mitarbeiter angezeigt wird.
4.  GuardianAI durchsucht eine Qdrant-Wissensdatenbank, die die Unternehmensrichtlinien enthält, nach relevanten Regeln.
5.  Ein kleineres, schnelles KI-Modell (via Groq) bewertet die Antwort anhand der gefundenen Regeln.
6.  GuardianAI gibt eine strukturierte JSON-Antwort mit einem `safety_level` ("safe" oder "not safe") und einem `reason` aus.
7.  Die Anwendung entscheidet basierend auf diesem `safety_level`, ob die ursprüngliche KI-Antwort angezeigt oder blockiert wird.

## Projektstruktur

-   `guardian_cli.py`: Ein benutzerfreundliches CLI-Tool zur Verwaltung der Qdrant-Datenbank.
-   `qdrant_utils.py`: Enthält die Kernlogik für die RAG-Pipeline.
-   `guardian_ai.py`: Enthält die Logik zur Evaluierung von Texten und das Pydantic-Modell für den strukturierten Output.
-   `app.py`: Eine Beispielanwendung, die den gesamten End-to-End-Workflow demonstriert.
-   `sample_policies/`: Ein Verzeichnis, das die Unternehmensrichtlinien enthält, die in die Wissensdatenbank indiziert werden sollen.
-   `requirements.txt`: Die erforderlichen Python-Abhängigkeiten.
-   `qdrant_rag_minimal.py`: Das ursprüngliche Kernskript (jetzt refaktorisiert, um `qdrant_utils` zu verwenden).

## Setup und Ausführung

### 1. Vorbereitung

**a) Docker und Qdrant:**
Stellen Sie sicher, dass Docker installiert ist, und starten Sie einen lokalen Qdrant-Container:
```bash
docker run -p 6333:6333 -p 6334:6334 -v qdrant_storage:/qdrant/storage qdrant/qdrant
```

**b) Python-Umgebung und Abhängigkeiten:**
Erstellen Sie eine virtuelle Umgebung und installieren Sie die Abhängigkeiten:
```bash
python -m venv .venv
source .venv/bin/activate  # Auf Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

**c) API-Schlüssel und Konfiguration:**
Erstellen Sie eine `.env`-Datei und fügen Sie Ihren Groq-API-Schlüssel hinzu. Sie können hier auch die URL für Ihre Qdrant-Instanz festlegen, falls diese vom Standard (`http://localhost:6333`) abweicht.
```
GROQ_API_KEY="Ihr_Groq_API_Schlüssel"
# QDRANT_URL="http://ihre-qdrant-url:6333" # Optional
```

### 2. Verwendung des `guardian-cli` Tools

Das `guardian-cli` Tool bietet eine einfache Schnittstelle zur Verwaltung Ihrer Daten.

**a) Sammlungen auflisten:**
Listet alle verfügbaren Sammlungen in Qdrant auf.
```bash
python guardian_cli.py list-collections
```

**b) Dokumente in einer Sammlung auflisten:**
```bash
python guardian_cli.py list-documents --collection guardianai_policies
```

**c) Indizierung der Richtlinien:**
Indizieren Sie die Beispieldaten in Ihre Qdrant-Datenbank.
```bash
python guardian_cli.py index --collection guardianai_policies --data-dir ./sample_policies
```

**d) Hinzufügen eines einzelnen Dokuments:**
```bash
python guardian_cli.py add-document --collection guardianai_policies --filepath ./path/to/your/document.txt
```

**e) Abfragen der Datenbank:**
```bash
python guardian_cli.py query --collection guardianai_policies -q "Wie funktioniert unser Onboarding?"
```

**f) Evaluierung eines Textes:**
```bash
python guardian_cli.py evaluate --collection guardianai_policies --text "Ich kann Ihnen eine sofortige Rückerstattung anbieten."
```

**g) Löschen eines Dokuments:**
```bash
python guardian_cli.py delete-document --collection guardianai_policies --doc-id "your-document-id"
```

### 3. Ausführung der Demo-Anwendung

Starten Sie die Beispielanwendung, um den GuardianAI-Workflow in Aktion zu sehen:

```bash
python app.py
```

Die Anwendung wird Sie auffordern, eine Frage zu stellen. Sie simuliert dann eine Antwort von einem primären LLM und lässt diese von GuardianAI bewerten.
