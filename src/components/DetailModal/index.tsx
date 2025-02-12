import * as React from 'react';
import ModalDialog from '../ModalDialog';
import { connect } from 'react-redux';
import './index.scss';
import { hideDetailAction, setAlphabetTypeAction } from 'actions';
import { declensionNoun } from 'utils/legacy/declensionNoun';
import { declensionAdjective } from 'utils/legacy/declensionAdjective';
import { conjugationVerb } from 'utils/legacy/conjugationVerb';
import { declensionNumeral } from 'utils/legacy/declensionNumeral';
import { LineSelector } from 'components/LineSelector';
import Table from 'components/Table';
import Text from 'components/Text';
import {
    getGender,
    getNumeralType,
    getPartOfSpeech,
    getPronounType,
    getVerbDetails,
    isAnimated,
    isIndeclinable,
    isPlural,
    isSingular,
} from 'utils/wordDetails';
import { Dictionary } from 'utils/dictionary';
import { getCyrillic } from 'utils/getCyrillic';
import { getLatin } from 'utils/getLatin';
import { declensionPronoun } from 'utils/legacy/declensionPronoun';
import { t } from 'translations';

interface IDetailModalProps {
    close: () => void;
    item: any;
    alphabetType: string;
    isDetailModal: boolean;
    flavorisationType: string;
    setAlphabetType: (type: string) => void;
    rawItem: string[];
}

const alphabetType = [
    {
        name: 'latin',
        value: 'latin',
    },
    {
        name: 'cyrillic',
        value: 'cyrillic',
    },
];

class DetailModal extends React.Component<IDetailModalProps> {
    private closeButtonRef = React.createRef<HTMLButtonElement>();

    public render() {
        const contents = this.renderContents();

        return (
            <ModalDialog
                className={'customModal'}
                wrapperClassName={'modal-content customModalContent'}
                open={!!contents}
                onOpen={this.onDialogOpened}
                onClose={this.close}
            >
                {contents}
            </ModalDialog>
        );
    }

    private renderContents() {
        if (!this.props.item || !this.props.isDetailModal) {
            return;
        }

        const pos = getPartOfSpeech(this.props.item.details);

        return (
            <>
                <header className={'modal-header'}>
                    {this.renderTitle(pos)}
                    <button
                        ref={this.closeButtonRef}
                        className={'close'}
                        onClick={this.close}
                        aria-label={'Close'}
                    >
                        <span aria-hidden={'true'}>&times;</span>
                    </button>
                </header>
                <div className={'modal-body'}>
                    {this.renderBody()}
                </div>
                <footer className={'modal-footer'}>
                    <LineSelector
                        options={alphabetType.map((item) => ({
                            name: t(item.name),
                            value: item.value,
                        }))}
                        value={this.props.alphabetType}
                        onSelect={(type) => this.props.setAlphabetType(type)}
                    />
                </footer>
            </>
        );
    }

    private onDialogOpened = () => {
        const closeButton = this.closeButtonRef.current;
        if (closeButton) {
            closeButton.blur();
        }
    }

    private close = () => {
        this.props.close();
    }

    private renderTitle(pos: string) {
        const word = this.props.rawItem[0];
        const add = this.props.rawItem[1];
        const { details } = this.props.item;
        const arr = [pos];
        const animated = isAnimated(details);
        const gender = getGender(details);
        const plural = isPlural(details);
        const singular = isSingular(details);
        const indeclinable = isIndeclinable(details);
        switch (pos) {
            case 'noun':
                arr.push(gender);
                if (gender.match(/masculine/)) {
                    arr.push(animated ? 'animated' : 'inanimate');
                }
                if (indeclinable) { arr.push('indeclinable'); }
                if (plural) { arr.push('plural'); }
                if (singular) { arr.push('singular'); }
                break;
            case 'verb':
                const verbDetails = getVerbDetails(details);
                if (verbDetails) {
                    arr.push(...verbDetails);
                }
                break;
            case 'numeral':
                const numeralType = getNumeralType(details);
                if (numeralType) {
                    arr.push(numeralType);
                }
            case 'pronoun':
                const pronounType = getPronounType(details);
                if (pronounType) {
                    arr.push(pronounType);
                }
        }
        return (
            <h5 className={'modal-title'}>
                {this.formatStr(word)} {this.formatStr(add)} <i>({arr.join(', ')})</i>
            </h5>
        );
    }

    private renderBody() {
        const splitted = this.props.rawItem[0].split(',');
        if (splitted.length === 1 && this.props.rawItem[2].indexOf('m./f.') !== -1 ) {
            return [
                this.renderWord([this.props.rawItem[0].trim(), this.props.rawItem[1], 'm.'],
                    ['showTitle', 'showGender', 'oneMore'], 0),
                this.renderWord([this.props.rawItem[0].trim(), this.props.rawItem[1], 'f.'],
                    ['showTitle', 'showGender'], 1),
            ];
        }
        return splitted.map((word, i) => {
            const options = [];
            if (splitted.length > 1) {
                options.push('showTitle');
                if (i < splitted.length - 1) { options.push('oneMore'); }
            }
            return this.renderWord([word.trim(), this.props.rawItem[1],  this.props.rawItem[2]], options, i);
        });
    }

    private renderWord(rawItem, options: string[], i) {
        const [ word, add, details ] = rawItem;
        let wordComponent;
        let remark = '';
        switch (getPartOfSpeech(details)) {
            case 'noun':
                if (options.includes('showGender')) {
                    remark = (details === 'm.' ? ' (masculine)' : ' (feminine)');
                }
                wordComponent = this.renderNounDetails(word, add, details);
                break;
            case 'adjective':
                wordComponent = this.renderAdjectiveDetails(word);
                break;
            case 'verb':
                let addVerb = add;
                // temporary fix for searching addition in parent verb
                // must be deleted when column 'addition' will be correct filled !!!
                if (!addVerb && word.includes(' ')) {
                    const BaseWord = Dictionary.getWordList().filter((item) => {
                        if (Dictionary.getField(item, 'isv') === word.split(' ')[0] &&
                            Dictionary.getField(item, 'addition') &&
                            Dictionary.getField(item, 'partOfSpeech').includes('v.')) { return true; }
                        return false;
                    });
                    if (BaseWord.length > 0) {
                        addVerb = Dictionary.getField(BaseWord[0], 'addition');
                    }
                }
                // normal verb
                wordComponent = this.renderVerbDetails(word, addVerb);
                break;
            case 'numeral':
                wordComponent = this.renderNumeralDetails(word, details);
                break;
            case 'pronoun':
                wordComponent = this.renderPronounDetails(word, details);
                break;
            default:
                return '';
        }
        return (
            <div className={'word'} key={i}>
                {options.includes('showTitle') ? <h6>{this.formatStr(word)}{remark}</h6> : ''}
                {wordComponent}
                {options.includes('oneMore') ? <hr/> : ''}
            </div>
        );
    }

    private formatStr(str: string): string {
        if (str === '') {
            return '';
        } else if (str === null) {
            return '&mdash;';
        } else if (str.match(/&\w+;/g)) {
            return str;
        }
        switch (this.props.alphabetType) {
            case 'latin':
                return getLatin(str, this.props.flavorisationType);
            case 'cyrillic':
                return getCyrillic(str, this.props.flavorisationType);
        }
    }

    private renderVerbDetails(word, add) {
        const data = conjugationVerb(word, add);
        if (data === null) {
            return (
                <div>
                    <Text>
                        {`No data for conjugation this verb`}
                    </Text>
                </div>
            );
        }
        const tableDataFirst = [
            [
                '&nbsp@bl;bt;w=2',
                'present@;b',
                'imperfect@;b',
                'future@;b',
            ],
        ];
        const tableDataSecond = [
            [
                '&nbsp@bl;bt;w=2',
                'perfect@;b',
                'pluperfect@;b',
                'conditional@;b',
            ],
        ];
        const tableDataAdd = [
            [
                'infinitive@b',
                this.formatStr(data.infinitive),
            ],
            [
                'imperative@b',
                this.formatStr(data.imperative),
            ],
            [
                'present active participle@b',
                this.formatStr(data.prap),
            ],
            [
                'present passive participle@b',
                this.formatStr(data.prpp),
            ],
            [
                'past active participle@b',
                this.formatStr(data.pfap),
            ],
            [
                'past passive participle@b',
                this.formatStr(data.pfpp),
            ],
            [
                'verbal noun@b',
                this.formatStr(data.gerund),
            ],
        ];
        const pronouns = [
            'ja',
            'ty',
            'on ona ono',
            'my',
            'vy',
            'oni one',
        ];
        const pronounsFull = [
            'ja',
            'ty',
            'on',
            'ona',
            'ono',
            'my',
            'vy',
            'oni one',
        ];
        const forms = [
            '1sg',
            '2sg',
            '3sg',
            '1pl',
            '2pl',
            '3pl',
        ];
        const formsFull = [
            '1sg',
            '2sg',
            '3sg',
            null,
            null,
            '1pl',
            '2pl',
            '3pl',
        ];
        pronouns.forEach((pronoun, i) => {
            tableDataFirst.push([
                `${forms[i]}@b`,
                `${this.formatStr(pronoun)}@`,
                `${this.formatStr(data.present[i])}@`,
                `${this.formatStr(data.imperfect[i])}@`,
                `${this.formatStr(data.future[i])}@`,
            ]);
        });
        pronounsFull.forEach((pronoun, i) => {
            const item = [
                `${this.formatStr(pronoun)}@`,
                `${this.formatStr(data.perfect[i])}@`,
                `${this.formatStr(data.pluperfect[i])}@`,
                `${this.formatStr(data.conditional[i])}@`,
            ];
            if (formsFull[i]) {
                let str = `${formsFull[i]}@b`;
                if (formsFull[i] === '3sg') {
                    str += ';h=3';
                }
                item.unshift(str);
            }
            tableDataSecond.push(item);
        });
        return (
            <>
                <Table key={0} data={tableDataFirst}/>
                <Table key={1} data={tableDataSecond}/>
                <Table key={2} data={tableDataAdd}/>
            </>
        );
    }

    private renderAdjectiveDetails(word) {
        const { singular, plural, comparison } = declensionAdjective(word, '');

        const tableDataSingular = this.getAdjectiveSingularCasesTable(singular);
        const tableDataPlural = this.getAdjectivePluralCasesTable(plural);
        const tableDataComparison = [
            [
                'Degrees of comparison@w=3;b',
            ],
            [
                'Positive@b;h=2',
                'adjective@b',
                `${this.formatStr(comparison.positive[0])}@`,
            ],
            [
                'adverb@b',
                `${this.formatStr(comparison.positive[1])}@`,
            ],
            [
                'Comparative@b;h=2',
                'adjective@b',
                `${this.formatStr(comparison.comparative[0])}@`,
            ],
            [
                'adverb@b',
                `${this.formatStr(comparison.comparative[1])}@`,
            ],
            [
                'Superlative@b;h=2',
                'adjective@b',
                `${this.formatStr(comparison.superlative[0])}@`,
            ],
            [
                'adverb@b',
                `${this.formatStr(comparison.superlative[1])}@`,
            ],
        ];
        return (
            <>
                <Table key={0} data={tableDataSingular}/>
                <Table key={1} data={tableDataPlural}/>
                <Table key={2} data={tableDataComparison}/>
            </>
        );
    }

    private renderNounDetails(word, add, details) {
        const gender = getGender(details);
        const animated = isAnimated(details);
        const plural = isPlural(details);
        const singular = isSingular(details);
        const indeclinable = isIndeclinable(details);

        const cases = declensionNoun(word, add, gender, animated, plural, singular, indeclinable);

        if (cases === null) {
            return (
                <div>
                    <Text>
                        {`No data for declination this word/phrase`}
                    </Text>
                </div>
            );
        }

        const tableDataCases = this.getSimpleCasesTable({
           columns: ['singular', 'plural'],
           cases,
        });

        return <Table data={tableDataCases}/>;
    }

    private getSimpleCasesTable(paradigmArray) {
        const tableDataCases = [[ 'Case@b' ]];
        paradigmArray.columns.forEach((col) => {
            tableDataCases[0].push(col + '@b');
        });
        Object.keys(paradigmArray.cases).forEach((caseItem) => {
            const tableRow = [`${caseItem[0].toUpperCase()}${caseItem.slice(1)}@b`];
            paradigmArray.cases[caseItem].forEach((caseForm) => {
                tableRow.push(`${this.formatStr(caseForm)}@`);
            });
            tableDataCases.push(tableRow);
        });
        return tableDataCases;
    }

    private getAdjectiveSingularCasesTable(singular) {
        const table = [
            [
                '&nbsp@bb;bl;bt',
                'singular@w=3;b',
            ],
            [
                '&nbsp@bl;bt',
                'masculine@b',
                'neuter@b',
                'feminine@b',
            ],
        ];
        if (singular.acc.length === 3) {
            table.push([
                    'Nom@b',
                    `${this.formatStr(singular.nom[0])}@`,
                    `${this.formatStr(singular.nom[1])}@`,
                    `${this.formatStr(singular.nom[2])}@`,
                ],
                [
                    'Acc@b',
                    `${this.formatStr(singular.acc[0])}@`,
                    `${this.formatStr(singular.acc[1])}@`,
                    `${this.formatStr(singular.acc[2])}@`,
                ]);
        } else {
            table.push([
                    'Nom@b',
                    `${this.formatStr(singular.nom[0])}@`,
                    `${this.formatStr(singular.nom[1])}@h=2`,
                    `${this.formatStr(singular.nom[2])}@`,
                ],
                [
                    'Acc@b',
                    `${this.formatStr(singular.acc[0])}@`,
                    `${this.formatStr(singular.acc[1])}@`,
                ]);
        }
        table.push(
            [
                'Gen@b',
                `${this.formatStr(singular.gen[0])}@w=2`,
                `${this.formatStr(singular.gen[1])}@`,
            ],
            [
                'Loc@b',
                `${this.formatStr(singular.loc[0])}@w=2`,
                `${this.formatStr(singular.loc[1])}@`,
            ],
            [
                'Dat@b',
                `${this.formatStr(singular.dat[0])}@w=2`,
                `${this.formatStr(singular.dat[1])}@`,
            ],
            [
                'Ins@b',
                `${this.formatStr(singular.ins[0])}@w=2`,
                `${this.formatStr(singular.ins[1])}@`,
            ]);
        return table;
    }

    private getAdjectivePluralCasesTable(plural) {
        const table = [
            [
                '&nbsp@bb;bl;bt',
                'plural@w=2;b',
            ],
            [
                '&nbsp@bl;bt',
                'masculine@b',
                'feminine/neuter@b',
            ],
        ];
        if (plural.acc.length === 2 && plural.nom[1] !== plural.acc[1]) {
            table.push(
                [
                    'Nom@b',
                    `${this.formatStr(plural.nom[0])}@`,
                    `${this.formatStr(plural.nom[1])}@`,
                ],
                [
                    'Acc@b',
                    `${this.formatStr(plural.acc[0])}@`,
                    `${this.formatStr(plural.acc[1])}@`,
                ]);
        } else {
            table.push(
                [
                    'Nom@b',
                    `${this.formatStr(plural.nom[0])}@`,
                    `${this.formatStr(plural.nom[1])}@h=2`,
                ],
                [
                    'Acc@b',
                    `${this.formatStr(plural.acc[0])}@`,
                ]);
        }
        table.push(
            [
                'Gen@b',
                `${this.formatStr(plural.gen[0])}@w=2`,
            ],
            [
                'Loc@b',
                `${this.formatStr(plural.loc[0])}@w=2`,
            ],
            [
                'Dat@b',
                `${this.formatStr(plural.dat[0])}@w=2`,
            ],
            [
                'Ins@b',
                `${this.formatStr(plural.ins[0])}@w=2`,
            ]);
        return table;
    }

    private renderNumeralDetails(word, details) {
        const numeralType = getNumeralType(details);
        const numeralParadigm = declensionNumeral(word, numeralType);
        if (numeralParadigm === null) {
            return (
                <div>
                    <Text>
                        {`No data for declination this word`}
                    </Text>
                </div>
            );
        }

        if (numeralParadigm.type === 'noun') {
            const tableDataCases = this.getSimpleCasesTable(numeralParadigm);
            return <Table data={tableDataCases}/>;
        }

        if (numeralParadigm.type === 'adjective') {
            const tableDataSingular = this.getAdjectiveSingularCasesTable(numeralParadigm.casesSingular);
            const tableDataPlural = this.getAdjectivePluralCasesTable(numeralParadigm.casesPlural);

            return (
                <>
                    <Table key={0} data={tableDataSingular}/>
                    <Table key={1} data={tableDataPlural}/>
                </>
            );
        }
    }

    private renderPronounDetails(word, details) {
        const pronounType = getPronounType(details);
        const pronounParadigm = declensionPronoun(word, pronounType);
        if (pronounParadigm === null) {
            return (
                <div>
                    <Text>
                        {`No data for declination this word`}
                    </Text>
                </div>
            );
        }

        if (pronounParadigm.type === 'noun') {
            const tableDataCases = this.getSimpleCasesTable(pronounParadigm);
            return <Table data={tableDataCases}/>;
        }

        if (pronounParadigm.type === 'adjective') {
            const tableDataSingular = this.getAdjectiveSingularCasesTable(pronounParadigm.casesSingular);
            const tableDataPlural = this.getAdjectivePluralCasesTable(pronounParadigm.casesPlural);

            return (
                <>
                    <Table key={0} data={tableDataSingular}/>
                    <Table key={1} data={tableDataPlural}/>
                </>
            );
        }
    }
}

function mapDispatchToProps(dispatch) {
    return {
        close: () => dispatch(hideDetailAction()),
        setAlphabetType: (type) => dispatch(setAlphabetTypeAction(type)),
    };
}

function mapStateToProps({detailModal, isDetailModal, results, rawResults, alphabetType, flavorisationType}) {
    return {
        item: results[detailModal],
        rawItem: rawResults[detailModal],
        alphabetType,
        isDetailModal,
        flavorisationType,
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(DetailModal);
