export class ColumnValuesBuilder {
    /**
     * Format a Text column value
     */
    static text(text: string): string {
        return text;
    }

    /**
     * Format a Numbers column value
     */
    static number(value: number | string): string {
        return String(value);
    }

    /**
     * Format a Date column value
     * @param date Date object or ISO string (YYYY-MM-DD)
     */
    static date(date: Date | string): { date: string; time?: string } {
        if (date instanceof Date) {
            return {
                date: date.toISOString().split('T')[0],
                time: date.toTimeString().split(' ')[0]
            };
        }
        return { date };
    }

    /**
     * Format a Status column value
     * @param label The label text to set
     */
    static status(label: string): { label: string } {
        return { label };
    }

    /**
     * Format a Dropdown column value
     * @param labels Array of labels to select
     */
    static dropdown(labels: string[]): { labels: string[] } {
        return { labels };
    }

    /**
     * Format a Link column value
     */
    static link(url: string, text: string): { url: string; text: string } {
        return { url, text };
    }

    /**
     * Format an Email column value
     */
    static email(email: string, text: string): { email: string; text: string } {
        return { email, text };
    }

    /**
     * Format a People column value
     * @param personIds Array of user IDs (numbers or strings)
     */
    static people(personIds: (number | string)[]): { personsAndTeams: { id: number; kind: string }[] } {
        return {
            personsAndTeams: personIds.map(id => ({
                id: Number(id),
                kind: 'person'
            }))
        };
    }

    /**
     * Format a Country column value
     */
    static country(countryCode: string, countryName: string): { countryCode: string; countryName: string } {
        return { countryCode, countryName };
    }

    /**
     * Generic JSON stringifier for the final payload if needed, 
     * though usually we pass the object directly to the SDK.
     */
    static json(values: Record<string, any>): string {
        return JSON.stringify(values);
    }
}
