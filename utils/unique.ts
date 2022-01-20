export function unique(arr: Array<any>) {
    const hash = {}, result = [];
    for ( let i = 0, l = arr.length; i < l; ++i ) {
        if ( !hash.hasOwnProperty(arr[i]) ) { //it works with objects! in FF, at least
            // @ts-ignore
            hash[ arr[i] ] = true;
            result.push(arr[i]);
        }
    }
    return result;
}
