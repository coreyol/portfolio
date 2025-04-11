class Type {
    static isString(variable) {
        return ((typeof variable === 'string') || (variable instanceof String));
    }

    static isNumber(variable) {
        return (typeof variable === 'number');
    }

    static isObject(variable) {
        return (typeof variable === 'object');
    }
    
    static isFunction(variable) {
        return (typeof variable === 'function');
    }
}

class Convert {
    static toNumber(number) {
        if (Type.isNumber(number)) {
            return number;
        } else if (Type.isString(number)) {
            return Number(number.replace(',', '').replace(' ', ''));
        }
        throw Error(`Cannot convert "${number}" to a number.`);
    }
}

class IndentedText {
    indent_size = 2;
    current_level = 0;
    text_blocks = [];

    constructor(indent_size = 2) {
        this.indent_size = indent_size;
        this.current_level = 0;
        this.text_blocks = [];
    }
    
    indent(level = 1) {
        if (level <= 0) {
            throw new Error(`Indentation level must be a positive integer, not ${level}.`);
        }

        this.current_level += level;
    }

    dedent(level = 1) {
        if (this.level <= level) {
            throw new Error(`Unable to dedent ${level} levels: current level is ${this.current_level}.`)
        }
        this.current_level -= level
    }

    push(...text) {
        for (const txt of text) {
            if (typeof txt === 'string' || txt instanceof String) {
                let block = this.text_blocks.slice(-1);
                if (block.level != this.current_level) {
                    block = {'level': this.current_level, 'text': []};
                    this.text_blocks.push(block);
                }
                block.text.push(txt);
            } else if (typeof txt === 'HierarchicalStringStack' || txt instanceof IndentedText) {
                const saved_level = this.current_level;
                for (const block of txt.text_blocks) {
                    this.current_level = saved_level + block.level;
                    for (const block_text of block.text) {
                        this.push(block_text);
                    }
                }
                this.current_level = saved_level;
            } else {
                throw new Error(`Value of type '${typeof txt}' cannot be appended to '${this.constructor.name}'!`);
            }
        }
    }

    texts(indent_size = 2) {
        const lines = [];
        for (const block of this.text_blocks) {
            for (const txt of block.text) {
                lines.push(`${' '.repeat(indent_size * block.level)}${txt}`);
            }
        }
        return lines;
    }

    text(indent_size = 2) {
        return this.texts(indent_size).join('\n');
    }
}

class Truthy {
    static first(arr, default_value = null) {
        const index = arr.findIndex(element => element);
        return (index != -1)? arr[index] : default_value;
    }

    static last(arr, default_value = null) {
        const index = arr.findLastIndex(element => element);
        return (index != -1)? arr[index] : default_value;
    }

    static first_property(obj, property_names, default_value = null) {
        return Truthy.first(property_names.map(name => obj[name]), default_value);
    }
    static last_property(obj, property_names, default_value = null) {
        return Truthy.last(property_names.map(name => obj[name]), default_value);
    }
    
    static array(arr, include_zero = false) {
        const test_function = (include_zero)? (e) => { return e === 0 || e } : (e) => { return e };
        return arr.filter(test_function);
    }

    static join(arr, sep = '', include_zero = false) {
        return Truthy.array(arr, include_zero).join(sep);
    }
}

class FormatDatetime {
    static compact(datetime) {
        const year = datetime.getFullYear().toString();
        const month = Datetime.zeroPadDigits(datetime.getMonth() + 1);
        const day = Datetime.zeroPadDigits(datetime.getDate());
        const hr = Datetime.zeroPadDigits(datetime.getHours());
        const min = Datetime.zeroPadDigits(datetime.getMinutes());
        const sec = Datetime.zeroPadDigits(datetime.getSeconds());
        const msec = Datetime.zeroPadDigits(datetime.getMilliseconds(), 3);

        return `${year}${month}${day}-${hr}${min}${sec}-${msec}`;
    }

    static standard(datetime) {
        const year = datetime.getFullYear().toString();
        const month = Datetime.zeroPadDigits(datetime.getMonth() + 1);
        const day = Datetime.zeroPadDigits(datetime.getDate());
        const hr = Datetime.zeroPadDigits(datetime.getHours());
        const min = Datetime.zeroPadDigits(datetime.getMinutes());
        const sec = Datetime.zeroPadDigits(datetime.getSeconds());
        const msec = Datetime.zeroPadDigits(datetime.getMilliseconds(), 3);

        return `${year}-${month}-${day} ${hr}:${min}:${sec}.${msec}`;
    }

    static date(datetime) {
        const year = datetime.getFullYear().toString();
        const month = Datetime.zeroPadDigits(datetime.getMonth() + 1);
        const day = Datetime.zeroPadDigits(datetime.getDate());

        return `${year}-${month}-${day}`;
    }

    static from_contiguous(compat_datetime_text) {
        if (!compat_datetime_text) {
            return '';
        }
    
        const year = compat_datetime_text.substring(0, 4);
        const month = compat_datetime_text.substring(4, 6);
        const day = compat_datetime_text.substring(6, 8);
        let dt_text = `${year}-${month}-${day}`;
            
        if (compat_datetime_text.length == 14) {
            const hr = compat_datetime_text.substring(8, 10);
            const min = compat_datetime_text.substring(10, 12);
            const sec = compat_datetime_text.substring(12, 14);
            dt_text += ` ${hr}:${min}:${sec}`;
        }
        return dt_text
    }
}

class FormatMonetary {
    static #locale = 'ko-KR';
    static #local_currency = 'KRW';
    
    static currency(amount, currency = 'KRW') {
        return Intl.NumberFormat(FormatMonetary.#locale, { style: 'currency', currency: currency, currencyDisplay: 'code' }).format(Convert.toNumber(amount));
    }

    static local_amount_breakdown(total, net_amount, tax, service_charge, cup_deposit) {
        const parts = [FormatMonetary.currency(net_amount),];
        if (tax) {
            parts.push(`${FormatMonetary.currency(tax)} (tax)`);
        }
        if (service_charge) {
            parts.push(`${FormatMonetary.currency(service_charge)} (service charge)`);
        }
        if (cup_deposit && Number(cup_deposit) > 0) {
            parts.push(`${FormatMonetary.currency(Number(cup_deposit))} (cup deposit)`);
        }
        return `${FormatMonetary.currency(total)} = ${parts.join(' + ')}`;
    }

    static foreign_currency_settlement(transaction_currency, transaction_amount, settlement_currency, settlement_amount, arrow = '->') {
        return [
            FormatMonetary.currency(transaction_amount, transaction_currency),
            FormatMonetary.currency(settlement_amount, settlement_currency)
        ].join(` ${arrow} `);
    }

    static foreign_exchange_breakdown(total, currency, amount, exchange_rate, local_amount, exchange_fee) {
        let text = `${FormatMonetary.currency(total, FormatMonetary.#local_currency)} = ${FormatMonetary.currency(amount, currency)} x ${FormatNumber.amount(exchange_rate, 2)}`;
        if (local_amount) {
            text += ` (= ${FormatMonetary.currency(local_amount)})`;
        }
        if (exchange_fee) {
            text += ` + ${FormatMonetary.currency(exchange_fee)}`;
        }
        return text;
    }
}

class FormatNumber {
    static #locale = 'ko-KR';

    static amount(number, n_decimcals = 0) {
        return Intl.NumberFormat(FormatNumber.#locale, { style: 'decimal', minimumFractionDigits: n_decimcals }).format(number);
    }

    static percentage(number, n_decimcals = 0) {
        return Intl.NumberFormat(FormatNumber.#locale, { style: 'percent', minimumFractionDigits: n_decimcals }).format(number);
    }
}

class FormatText {
    static card_name(card_name, card_ending_digits = '') {
        let text = '';
        if (card_name) {
            text += card_name;
        }
        
        if (card_ending_digits) {
            text += `(${card_ending_digits})`;
        }
        return text;
    }

    static business_registration_number(br_number) {
        if (!br_number || (br_number.length != 10)) {
            return br_number;
        }
        return `${br_number.substring(0, 3)}-${br_number.substring(3, 5)}-${br_number.substring(5, 10)}`;
    }

    static bulletize(text, bullet = '') {
        const bullet_header = (bullet)? `${bullet} ` : '';
        if (Type.isString(text)) {
            return `${bullet_header}${text}`;
        } else if (Array.isArray(text)) {
            return text.map(txt => `${bullet_header}${txt}`);
        }
        throw Error(`Cannot bulletize '${text.constructor.name}'.`);
    }

    static value(val) {
        if (Type.isString(val)) {
            return `"${val}"`;
        } else if (Type.isObject(val)) {
            return JSON.stringify(val);
        } else {
            return val;
        }
    }

    static key_values(key_value_pairs, brackets = '{}') {
        const text = key_value_pairs.map(pair => pair.map(val => FormatText.value(val)).join(': ')).join(', ');
        
        return `${brackets[0]}${text}${brackets[1]}`;
    }

    static error_message_value(message, label, value) {
        const label_text = (label_text)? `: ${label}` : '';
        return `${message}${label_text}: ${FormatText.value(value)}`;
    }

    static error_message_values(message, label_values) {
        const values_text = label_values.map(([label_text, value]) => `${(label_text)? `${label_text} = ` : ''}${FormatText.value(value)}`).join(', ');
        return `${message}: [${values_text}]`;
    }

    static error_message_obj_fields(message, label, obj, field_names) {
        return `${message}: ${FormatFields.name_values(label, obj, field_names)} / ${label}: ${JSON.stringify(obj)}`;
    }

    static request_override_error_message(self, method) {
        if (Type.isFunction(method)) {
            const method_name = method.name;
        } else if (Type.isString(method)) {
            const method_name = method;
        }
        return `Please subclass '${self.constructor.name}' class and override '${method_name}' method.`;
    }
}

class FormatFields {
    static name_values(label, obj, field_names) {
        return label + field_names.map(name => `.${name}: ${FormatText.value(obj[name])}`).join(', ');
    }
}

class Log {
    static caller_name(depth, self = null) {
        const stack = new Error().stack;
        let caller = stack.split('\n')[2 + depth].trim().split(' ').slice(1, -1).join(' ').trim();
        if ((self) && (caller.indexOf('.') == -1)) {
            caller = `${self.constructor.name}.(${caller})`;
        }
        return caller;
    }

    static variable(label, value, self = null) {
        const func_name = Log.caller_name(1, self);
        if (typeof value === 'object') {
            value = JSON.stringify(value);
        }
        console.log(`[${func_name}] ${label}: ${value}`);
    }

    static obj_fields(label, obj, field_names, self = null) {
        const func_name = Log.caller_name(1, self);
        console.log(`[${func_name}] ${FormatFields.name_values(label, obj, field_names)}`);
    }

    static json_array(label, json_array) {
        let log_text = new IndentedText();
    
        if (json_array.length > 0) {
            log_text.push(`${label}: [`);
            log_text.indent();
            for (const json_obj of json_array) {
                log_text.push(`${JSON.stringify(json_obj)}`);
            }
            log_text.dedent();
            log_text.push(`]`);
        } else {
            log_text.push(`${label}: []`);
        }
    
        console.log(log_text.text())
    }

    static error(error) {
        console.log(error);
    }
}

class TimeInterval {
    start_time;
    end_time;

    constructor(start_time, end_time) {
        this.start_time = start_time;
        this.end_time = end_time;
    }

    get seconds() {
        return this.milliseconds / 1000 ;
    }

    get milliseconds() {
        return this.end_time - this.start_time;
    }

    toString(sep = ' -> ') {
        return `${Datetime.toLocalISOString(this.start_time)}${sep}${Datetime.toLocalISOString(this.end_time)} (${this.milliseconds} msec)`;
    }

    toContiguousDatetimeString(sep = ' -> ') {
        return `${Datetime.to_split_contiguous_datetime(this.start_time).as_contiguous()}${sep}${Datetime.to_split_contiguous_datetime(this.end_time).as_contiguous()} (${this.milliseconds} millisecs)`;
    }

    pause_message() {
        if (this.milliseconds > 0) {
            return `[${Datetime.toLocalISOString(this.start_time)}] Paused; To be resumed in ${FormatNumber.amount(this.milliseconds)} msecs at ${Datetime.toLocalISOString(this.end_time)}`;
        }
        return '';
    }

}

class SplitContiguousDatetime {
    date;
    time;
    milliseconds;

    constructor (date, time = '', milliseconds = '') {
        this.date = date;
        this.time = time;
        if ((time == '') && (milliseconds != '')) {
            throw Error(`time is empty, but milliseconds is not.`);
        }
        this.milliseconds = milliseconds;
    }

    as_datetime() {
        const sep = ' ';
        const msec_sep = '.';
        return Datetime.from_contiguous(this.as_contiguous(sep, msec_sep));
    }

    as_contiguous(sep = ' ', msec_sep = '.') {
        let time_contiguous = (this.time)? `${sep}${this.time}` : '';
        time_contiguous += (this.milliseconds)? `${msec_sep}${this.milliseconds}` : '';
        return `${this.date}${time_contiguous}`;
    }
}

class Datetime {
    static split_contiguous(contiguous_datetime_text, sep = ' ', msec_sep = '.') {
        if (!contiguous_datetime_text) {
            throw Error(FormatText.error_message_values(
                'Invalid contiguous datetime text',
                [
                    ['', contiguous_datetime_text],
                ]
            ));
        }

        const [datetime_text, ...after_decimal] = contiguous_datetime_text.split(msec_sep);
        let milliseconds_text = '';
        if ((after_decimal.length == 1) && (after_decimal[0].length != '')) {
            milliseconds_text = after_decimal[0].padEnd(3, '0');
        }

        let date_stop_index = 8;
        let time_start_index = 8;
        if (sep != '') {
            const sep_index = datetime_text.indexOf(sep);
            if (sep_index != -1) {
                date_stop_index = sep_index;
                time_start_index = sep_index + 1;
            }
        }
        const date_text = datetime_text.slice(0, date_stop_index);
        const time_text = datetime_text.slice(time_start_index);

        if (((date_text.length != 0) && (date_text.length != 8)) || ((time_text.length != 0) && (time_text.length != 6))) {
            throw Error(FormatText.error_message_values(
                'Invalid contiguous datetime text',
                [
                    ['contiguous_datetime_text', contiguous_datetime_text],
                    ['sep', sep],
                    ['msec_sep', msec_sep],
                    ['date_text', date_text],
                    ['time_text', time_text],
                ]
            ));
        }

        return new SplitContiguousDatetime(date_text, time_text, milliseconds_text);
    }

    static from_contiguous(contiguous_datetime_text, sep = ' ', msec_sep = '.') {
        const contiguous_datetime = Datetime.split_contiguous(contiguous_datetime_text);
        if (contiguous_datetime.date.length != 8) {
            throw Error(FormatText.error_message_values(
                'Invalid date part in datetime text',
                [
                    ['contiguous_datetime_text', contiguous_datetime_text],
                    ['sep', sep],
                    ['msec_sep', msec_sep],
                    ['date_text', contiguous_datetime.date],
                    ['time_text', contiguous_datetime.time],
                ]
            ));
        }
    
        const year = contiguous_datetime.date.substring(0, 4);
        const month = contiguous_datetime.date.substring(4, 6);
        const day = contiguous_datetime.date.substring(6, 8);
            
        let datetime;
        if (contiguous_datetime.time.length == '') {
            datetime = new Date(year, month - 1, day);
        } else {
            const hr = contiguous_datetime.time.substring(0, 2);
            const min = contiguous_datetime.time.substring(2, 4);
            const sec = contiguous_datetime.time.substring(4, 6);

            if (contiguous_datetime.milliseconds != '') {
                datetime = new Date(year, month - 1, day, hr, min, sec, parseInt(contiguous_datetime.milliseconds));
            }
            else {
                datetime = new Date(year, month - 1, day, hr, min, sec);
            }
        }
        return datetime;
    }

    static zeroPadDigits(n, length = 2) {
        return n.toString().padStart(length, '0');
    }

    static to_contiguous_date(datetime) {
        return `${datetime.getFullYear().toString()}${Datetime.zeroPadDigits(datetime.getMonth() + 1)}${Datetime.zeroPadDigits(datetime.getDate())}`;
    }

    static to_contiguous_time(datetime) {
        return `${Datetime.zeroPadDigits(datetime.getHours())}${Datetime.zeroPadDigits(datetime.getMinutes())}${Datetime.zeroPadDigits(datetime.getSeconds())}.${Datetime.zeroPadDigits(datetime.getMilliseconds(), 3)}`;
    }

    static to_split_contiguous_datetime(datetime) {
        return new SplitContiguousDatetime(Datetime.to_contiguous_date(datetime), ...Datetime.to_contiguous_time(datetime).split('.'));
    }

    static timezone_offset(datetime) {
        const tz_offset = -datetime.getTimezoneOffset();
        const sign = (tz_offset >= 0)? '+' : '-';
        return `${sign}${Datetime.zeroPadDigits(tz_offset / 60)}:${Datetime.zeroPadDigits(tz_offset % 60)}`;
    }

    static toLocalISOString(datetime) {
        const year = Datetime.zeroPadDigits(datetime.getFullYear());
        const month = Datetime.zeroPadDigits(datetime.getMonth() + 1);
        const day = Datetime.zeroPadDigits(datetime.getDate());
        const hours = Datetime.zeroPadDigits(datetime.getHours());
        const minutes = Datetime.zeroPadDigits(datetime.getMinutes());
        const seconds = Datetime.zeroPadDigits(datetime.getSeconds());
        const milliseconds = Datetime.zeroPadDigits(datetime.getMilliseconds(), 3);

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${Datetime.timezone_offset(datetime)}`;
    }
}

class InvalidQueryDataError extends Error {
    constructor(message) {
      super(message);
      this.name = 'InvalidQueryDataError';
    }
}

class CreditCardAPIRequestError extends Error {
    constructor(message, error_data) {
      super(message);
      this.name = 'CreditCardAPIRequestError';
      this.error_data = error_data;
    }
}

class CreditCardAPIEndpoint {
    base_url = 'https://www.creditcard.com';
    subpath = 'api/v1';
    endpoint;

    constructor(endpoint) {
        this.endpoint = endpoint;
    }

    get endpoint_subpath() {
        return `/${this.subpath}/${this.endpoint}`;
    }

    get endpoint_fullpath() {
        return `${this.base_url}/${this.subpath}/${this.endpoint}`;
    }

    get source_text() {
        return `api.${this.endpoint}`;
    }
}

class CreditCardAPIResponse {
    endpoint;
    #query_data;
    response;

    constructor(api_endpoint, query_data, api_response) {
        this.endpoint = api_endpoint;
        this.#query_data = query_data;
        this.response = api_response;
    }

}

class CreditCardQueryAPI {
    endpoint;
    
    constructor(api_endpoint){
        if (api_endpoint instanceof CreditCardAPIEndpoint) {
            this.endpoint = api_endpoint;
        } else if (Type.isString(api_endpoint)) {
            this.endpoint = new CreditCardAPIEndpoint(api_endpoint);
        } else {
            throw Error(FormatText.error_message_value('Invalid endpoint', '', api_endpoint));
        }
    }

    query_transactions(start_date, end_date) {
        const data = 'query_form';
        let response;
        
        $.hcAjax({
            data: data,
            showLoading: false,
            async: false,
            url: this.endpoint.endpoint_subpath,
            type: 'post',
            success: (api_response,) => {
                response = new CreditCardAPIResponse(this.endpoint, {applyId: apply_id}, api_response);
            },
            error: (code, message, data) => {
                const error_data = {
                    'error_code': code,
                    'message': message,
                    'data': data,
                }
                const error_message = `Credit Card API Request Error ${code} (API ${this.endpoint.endpoint}) (${start_date} - ${end_date}): ${message}`;
                throw new CreditCardAPIRequestError(error_message, error_data);
            }
        });

        return response;
    }
}

class TransactionItemBase {
    fields;
    
    constructor(item) {
        this.fields = item;
    }

    get is_settled() {
        return this.fields.settled;
    }

    get is_pending() {
        return !this.is_settled;
    }

    get is_foreign_currency_trasaction() {
        return (this.currency != 'KRW');
    }

    get transaction_currency_type() {
        if (this.is_foreign_currency_trasaction) {
            return 'foreign'
        } else {
            return 'local'
        }
    }

    truthy_property_among(property_names) {
        return Truthy.first_property(this.fields, property_names);
    }

    get amount() {
        return this.fields.approved_amount;
    }

    get currency_amount() {
        return FormatMonetary.currency(this.fields.approved_amount);
    }
    
    get datetime_text() {
        let dt_text = this.fields.approved_date;
        if ((dt_text.length == 8) && (this.fields.approved_time?.length === 6)) {
            dt_text += this.fields.approved_time;
        }

        return FormatDatetime.from_contiguous(dt_text)
    }

    get card_ending_digits() {
        return this.receipt?.card_ending_digits;
    }

    get card_name_text() {
        return FormatText.card_name(this.fields.name, this.card_ending_digits);
    }

    get merchant_name() {
        return this.fields.merchant;
    }

    get merchant_number() {
        return this.fields.merchant_number;
    }

    get merchant_category() {
        return (!this.fields.merchant)? '' : this.fields.merchant;
    }

    get merchant_text() {
        let location_text = `${(this.fields.city)? `${this.fields.city}, ` : ''}${(this.fields.nation)? this.fields.nation : ''}`;
        location_text = `${(location_text)? ` (in ${location_text})` : ''}`;

        const parts = [
            `${this.merchant_name}${location_text}`,
            this.merchant_number,
            this.merchant_category
        ];
        return Truthy.join(parts, ' · ');
    }

    get amount_breakdown() {
        return FormatMonetary.local_amount_breakdown(this.fields.approved_amount, this.fields.registered_amount, this.fields.sales_tax, '', '');
    }

    get installment_period_text() {
        return this.fields.installment;
    }
    
    get is_canceled() {
        throw Error(FormatText.request_override_error_message(this, 'is_canceled'));
    }

    get canceled_text() {
        if (!this.is_canceled) {
            return '';
        }
        let text = '(CANCELED';
        if (this.fields.cancel_date) {
            text += ` ${FormatDatetime.from_contiguous(this.fields.cancel_date)}`;
        }
        text += ')';
        return text;
    }

    get headline() {
        let parts = [];
        if (this.is_canceled) {
            parts.push(this.canceled_text);
        }
        parts.push(this.datetime_text);
        parts.push(this.fields.approval_number);
        parts.push(this.merchant_name);
        parts.push(FormatMonetary.currency(this.amount));
        return Truthy.join(parts, ' · ');
    }

    get summary_text() {
        const text = [];

        let parts = [];
        parts.push(Truthy.join([this.canceled_text, this.merchant_name], ' '));
        parts.push(this.fields.approval_number);
        if (this.is_foreign_currency_trasaction) {
            if (!this.is_settled) {
                parts.push(FormatMonetary.currency(this.fields.currency_amount, this.fields.currency));
            } else {
                parts.push(FormatMonetary.currency(this.fields.billing_amount, this.fields.billing_currency));
            }
        }
        parts.push(FormatMonetary.currency(this.amount));
        text.push(Truthy.join(parts, ' · '));

        parts = [this.card_name_text, this.datetime_text];
        text.push(Truthy.join(parts, ' · '));

        text.push(this.amount_breakdown);

        return text;
    }

    get summary_yaml() {
        let yaml_lines = new IndentedText();

        yaml_lines.push(...FormatText.bulletize(this.summary_text, '-'));

        return yaml_lines;
    }

    get fields_serialized() {
        const yaml_lines = new IndentedText();

        yaml_lines.push(`transaction: ${JSON.stringify(this.fields)}`);
        if (this.receipt) {
            yaml_lines.push(`receipt: ${this.receipt.serialized}`);
        }
        if (this.merchant) {
            yaml_lines.push(`merchant: ${this.merchant.serialized}`);
        }

        return yaml_lines;
    }

    yamlize(index, index_length) {
        const index_text = String(index).padStart(index_length, '0')
        const headline = `(${index_text}) ${this.headline}`;

        let yaml_lines = new IndentedText();
    
        yaml_lines.push(`- headline: ${headline}`);
        yaml_lines.indent();
        yaml_lines.push(`item_index: ${index_text}`);
        yaml_lines.push(`summary:`);
        yaml_lines.indent();
        yaml_lines.push(`transaction:`);
        yaml_lines.push(this.summary_yaml);
        if (this.receipt) {
            yaml_lines.push(`receipt:`);
            yaml_lines.push(this.receipt.summary_yaml);
        }
        if (this.merchant) {
            yaml_lines.push(`merchant: ${this.merchant.one_liner}`);
        }
        yaml_lines.dedent();
        yaml_lines.push(`fields:`);
        yaml_lines.indent();
        yaml_lines.push(this.fields_serialized);

        return yaml_lines;
    }
}

class AuthorizedTransactionItem extends TransactionItemBase {
    get is_canceled() {
        return (this.fields.cancled);
    }
    
    get amount_breakdown() {
        if (this.fields.class == 'D') {
            return FormatMonetary.local_amount_breakdown(this.fields.approved_amount, this.fields.approved_amount_percent, this.fields.tax, this.fields.fee, this.fields.deposit);
        } else if (this.fields.class == 'I') {
            return `${FormatMonetary.currency(this.fields.approved_amount)} (${FormatMonetary.currency(this.fields.currency_amount, this.fields.currency)})`;
        } else {
            return `${FormatMonetary.currency(this.fields.approved_amount)}`;
        }
    }
}

class SettledTransactionItem extends TransactionItemBase {
    get is_canceled() {
        return (this.fields.canceled);
    }

    get amount() {
        if (this.is_foreign_currency_trasaction) {
            return Number(this.fields.registered_amount.replace(',', '')) + Number(this.fields.extra_fee.replace(',', ''));
        } else {
            return super.amount;
        }
    }
    
    get amount_breakdown() {
        if (this.fields.billing_currency) {
            return [
                FormatMonetary.foreign_currency_settlement(this.fields.currency, this.fields.foreign_currency_amount, this.fields.billing_currency, this.fields.billing_amount),
                FormatMonetary.foreign_exchange_breakdown(this.amount, this.fields.billing_currency, this.fields.billing_amount, this.fields.billing_after_fee, this.fields.registered_amount, this.fields.extra_fee)
            ].join(' · ');
        } else {
            return FormatMonetary.local_amount_breakdown(this.fields.approved_amount, this.fields.registered_amount, this.fields.sales_tax, '', '');
        }
    }
}

class DateSpan {
    static #one_day_msecs = 24 * 60 * 60 * 1000;
    start;
    end;

    constructor(start, end) {
        function check_date_validity(date) {
            if (!(date instanceof Date)) {
                throw ValueError(f`Invalid date: ${date}`)
            }
        }

        check_date_validity(start);
        check_date_validity(end);

        this.start = start;
        this.end = end;
    }

    static from_contiguous(startDate_contiguous, endDate_contiguous) {
        return new DateSpan(Datetime.from_contiguous(startDate_contiguous), Datetime.from_contiguous(endDate_contiguous));
    }

    static remaining_month(year, month, day = 1) {
        if ((month < 1) || (month > 12)) {
            throw ValueError(`Invalid month: ${month}`);
        }

        const month_index = month - 1;
        const date_next_month = new Date(year + ((month < 12)? 0 : 1), (month < 12)? month : 0, 1);
        const end_date = new Date(date_next_month.valueOf() - DateSpan.#one_day_msecs);
        return new DateSpan(new Date(year, month_index, day), end_date);
    }

    static month_upto(datetime) {
        return new DateSpan(new Date(datetime.getFullYear(), datetime.getMonth(), 1), datetime);
    }

    get start_text() {
        return FormatDatetime.date(this.start);
    }

    get end_text() {
        return FormatDatetime.date(this.end);
    }

    get start_contiguous() {
        return Datetime.to_contiguous_date(this.start);
    }

    get end_contiguous() {
        return Datetime.to_contiguous_date(this.end);
    }

    get days_span() {
        return Math.floor((this.end - this.start) / DateSpan.#one_day_msecs) + 1;
    }

    get text() {
        const days = this.days_span;
        const days_text = `${days} day${(days > 1)? 's' : ''}`;
        return `${this.start_text} - ${this.end_text} (${days_text})`;
    }
}

class TimeSpan {
    start;
    end;

    constructor(start, end) {
        this.start = start;
        this.end = end;
    }

    get start_text() {
        return FormatDatetime.standard(this.start);
    }

    get end_text() {
        return FormatDatetime.standard(this.end);
    }

    get elapsed_sec() {
        return (this.end - this.start) / 1000;
    }

    get elapsed_sec_text() {
        return FormatNumber.amount(this.elapsed_sec, 3);
    }

    get text() {
        return `${this.start_text} -> ${this.end_text} (${this.elapsed_sec_text} secs)`;
    }
}


class TransactionItemsBase {
    items;
    query_runtime_span;
    #api_endpoint;

    constructor(dates_span) {
        [
            this.response_parameters,
            this.list_summary_stat,
            this.transactions,
            this.installment_convertible_transactions,
            this.query_runtime_span,
            this.#api_endpoint
        ] = this.query_items(dates_span);
        Log.obj_fields('api_endpoint', this.#api_endpoint, ['endpoint'], this);
    }

    get list_category() {
        throw Error(FormatText.request_override_error_message(this, 'list_category'));
    }

    get api_endpoint() {
        throw Error(FormatText.request_override_error_message(this, 'api_endpoint'));
    }

    get aggregators() {
        throw Error(FormatText.request_override_error_message(this, 'aggregators'));
    }

    query(dates_span) {
        try {
            const start_time = new Date(Date.now());
            Log.variable('api_endpoint', this.api_endpoint);
            const response = new CreditCardQueryAPI(this.api_endpoint).query_transactions(dates_span.start_contiguous, dates_span.end_contiguous);
            const end_time = new Date(Date.now());
            return [response, new TimeSpan(start_time, end_time)];
        } catch (error) {
            if (error instanceof CreditCardAPIRequestError) {
                Log.error(error);
            } else {
                throw error;
            }
        }
        return [null, null];
    }
    
    query_items(dates_span) {
        const [api_response, query_runtime_span] = this.query(dates_span);
        const transactions_map = {};
        const response_parameters = {};
        const installment_convertible_transactions = [];
        const list_summary_stat = {};
        const aggregators = this.aggregators;

        for (const [key, value] of Object.entries(api_response.response)) {
            for (const [list_key, items] of Object.entries(aggregators[key](value))) {
                transactions_map[list_key] = items;

                const index_length = items.length.toString().length;
                for (const [index, item] of items.entries()) {
                    item.fields['_item_key_'] = `${list_key}_${index.toString().padStart(index_length, '0')}`;
                }
            }
            
        }

        return [
            response_parameters,
            list_summary_stat,
            transactions_map,
            installment_convertible_transactions,
            query_runtime_span,
            api_response.endpoint
        ];
    }

    get yamlized_transaction_summary() {
        const yaml_lines = new IndentedText();
    
        const transaction_items_array = this.transactions[array_key];
        for (const transaction_item of transaction_items_array) {
            const summary_text = transaction_item.summary_text;
            yaml_lines.push(FormatText.bulletize(summary_text[0], '-'));
            yaml_lines.indent();
            yaml_lines.push(summary_text[1]);
            yaml_lines.push('-'.repeat(summary_text[1].length));
            yaml_lines.dedent();
        }
        return yaml_lines;
    }

    get yamlized_transaction_items() {
        const yaml_lines = new IndentedText();
    
        const transaction_items_array = this.transactions[array_key];
        const index_length = transaction_items_array.length.toString().length;
        for (const [transaction_index, transaction_item] of transaction_items_array.entries()) {
            yaml_lines.push(transaction_item.yamlize(transaction_index + 1, index_length));
        }
        return yaml_lines;
    }

    get response_parameters_yaml_line() {
        return [
            'response_parameters',
            FormatText.key_values(Object.entries(this.response_parameters), '{}')
        ].join(': ');
    }

    get response_parameters_yaml_lines() {
        const  yaml_lines = new IndentedText();

        yaml_lines.push('response_parameters:')
        yaml_lines.indent();
        for (const [key, value] of Object.entries(this.response_parameters)) {
            yaml_lines.push(`${key}: \'${value}\'`);
        }
        return yaml_lines;
    }

    get yamlized_response() {
        const yaml_lines = new IndentedText();

        yaml_lines.push(this.response_parameters_yaml_line);

        if (Object.keys(this.list_summary_stat).length > 0) {
            yaml_lines.push(`summary_stat: ${JSON.stringify(this.list_summary_stat)}`);
        }

        yaml_lines.push('list:');
        yaml_lines.indent();
        yaml_lines.push(this.yamlized_transaction_summary);
        yaml_lines.dedent();

        yaml_lines.push('transactions:');
        yaml_lines.indent();
        yaml_lines.push(this.yamlized_transaction_items);

        if (Object.keys(this.installment_convertible_transactions).length > 0) {
            yaml_lines.dedent();
            yaml_lines.push('installment-convertible transactions:');
            yaml_lines.push(...FormatText.bulletize(this.installment_convertible_transactions.map(obj => JSON.stringify(obj)), '-'));
        }

        return yaml_lines;
    }

    get query_dates_span() {
        const startDate = this.list_summary_stat.startdate;
        const endDate = this.list_summary_stat.enddate;
    
        return new DateSpan(Datetime.from_contiguous(startDate), Datetime.from_contiguous(endDate));
    }

    get n_transactions() {
        let n = 0;
        for (const items of Object.values(this.transactions)) {
            n += items.length;
        }
        return n;
    }

    get query_id() {
        return FormatDatetime.compact(this.query_runtime_span.start);
    }

    get data_source_text() {
        return this.#api_endpoint.source_text;
    }

    get list_category_yaml_line() {
        return `list_category: ${this.list_category_text}`;
    }

    get endpoint_subpath_yaml_line() {
        return `endpoint: ${this.#api_endpoint.endpoint_subpath}`;
    }

    get datespan_yaml_lines() {
        const yaml_lines = new IndentedText();

        yaml_lines.push('datespan:');
        yaml_lines.indent();
        yaml_lines.push(`start: ${this.query_dates_span.start_text}`);
        yaml_lines.push(`end: ${this.query_dates_span.end_text}`);
        return yaml_lines;
    }

    get query_runtime_yaml_lines() {
        const yaml_lines = new IndentedText();
        
        yaml_lines.push('query_runtime:');
        yaml_lines.indent();
        yaml_lines.push(`start: ${this.query_runtime_span.start_text}`)
        yaml_lines.push(`end: ${this.query_runtime_span.end_text}`)
        yaml_lines.push(`elapsed: ${this.query_runtime_span.elapsed_sec_text} sec`)
        return yaml_lines;
    }

    get list_size_yaml_line() {
        const n_s = [
            ['transactions', this.n_transactions],
        ];
        return ['n_items', FormatText.key_values(n_s, '{}')].join(': ');
    }

    get list_size_yaml_lines() {
        const yaml_lines = new IndentedText();

        yaml_lines.push('n_items:');
        yaml_lines.indent();
        yaml_lines.push(`transactions: ${this.n_transactions}`)
        return yaml_lines;
    }

    get yamlized() {
        const yaml_lines = new IndentedText();
        yaml_lines.push(`- list_id: ${this.query_id}`);
        yaml_lines.indent();
        yaml_lines.push(this.list_category_yaml_line);
        yaml_lines.push(this.endpoint_subpath_yaml_line);
        
        yaml_lines.push(this.datespan_yaml_lines);
        yaml_lines.push(this.query_runtime_yaml_lines);
        yaml_lines.push(this.list_size_yaml_line);
        
        yaml_lines.push(this.yamlized_response);
    
        Log.variable('query dates span', this.query_dates_span.text);
        return yaml_lines;
    }
}

class AuthorizedTransactionItems extends TransactionItemsBase {
    get list_category() {
        return 'authorized';
    }

    get list_category_text() {
        return 'authorized transaction';
    }

    get api_endpoint() {
        return 'authorized_transactions';
    }

    transaction_wrapper(transaction_item) {
        return AuthorizedTransactionItem;
    }

    get aggregators() {
        return {
            'authorized': (transaction_items_array) => {
                const transactions = {
                    'purchase': [],
                };
                for (const item of transaction_items_array) {
                    const wrapper = this.transaction_wrapper(item);
                    transactions.purchase.push(new wrapper(item));
                }
                return transactions;
            },
        };
    }
}

class SettledTransactionItems extends TransactionItemsBase {
    get list_category() {
        return 'settled';
    }

    get list_category_text() {
        return 'settled transaction';
    }

    get api_endpoint() {
        return 'settle_transactions';
    }

    transaction_wrapper(transaction_item) {
        return SettledTransactionItem;
    }

    get aggregators() {
        return {
            'settled': (transaction_items_array) => {
                const transactions = {
                    'purchase': [],
                };
                for (const item of transaction_items_array) {
                    const wrapper = this.transaction_wrapper(item);
                    transactions.purchase.push(new wrapper(item));
                }
                return transactions;
            },
        };
    }
}

class SectionedIndentedText extends IndentedText {
    insert_marker_line(marker_text, pretext, posttext, sep = ' ') {
        this.push(`${pretext}${sep}${marker_text}${sep}${posttext}`);
    }

    start_section(header_text) {
        const ribbon_text = '='.repeat(20);
        this.insert_marker_line(header_text, ribbon_text, ribbon_text);
    }

    end_section(footer_text) {
        const ribbon_text = '-'.repeat(20);
        this.insert_marker_line(footer_text, ribbon_text, ribbon_text);
    }
}

async function get_transaction_over_whole_period() {
    months_classes = [
        [24, SettledTransactionItems, 'settled transactions'],
        [3, AuthorizedTransactionItems, 'authorized transactions'],
    ]

    const query_runtime_texts = new IndentedText();
    const texts = new SectionedIndentedText();
    const current_time = new Date();
    
    for (const [months, transaction_items_class, category_text] of months_classes) {
        const date_spans = [];
        for (const month_diff of Array(months).keys()) {
            let start_day = 1;
            if (month_diff == 0) {
                start_day = current_time.getDate();
            }
            const start_date = new Date(current_time.getFullYear(), current_time.getMonth() - (months - month_diff), start_day);
            date_spans.push(DateSpan.remaining_month(start_date.getFullYear(), start_date.getMonth() + 1, start_day));
        }
        date_spans.push(DateSpan.month_upto(current_time));

        query_runtime_texts.push(`${category_text}:`);
        query_runtime_texts.indent();
        for (const date_span of date_spans) {
            texts.start_section(`${category_text} ${date_span.text}`);
            const transactions = new transaction_items_class(date_span);
            texts.push(transactions.yamlized);
            query_runtime_texts.push(`${date_span.text}: ${transactions.query_runtime_span.start_text} - ${transactions.query_runtime_span.end_text} (${transactions.query_runtime_span.elapsed_sec_text} secs)`);
            texts.end_section(`${category_text} ${date_span.text}`);
        }
        query_runtime_texts.dedent();
    }
    query_runtime_section_header = 'Query runtime';
    texts.start_section(query_runtime_section_header);
    texts.push(query_runtime_texts);
    texts.end_section('-'.repeat(query_runtime_section_header.length));
    return texts;
}

async function main() {
    for (const text of get_transaction_over_whole_period()) {
        console.log(text);
    }
}

main();
