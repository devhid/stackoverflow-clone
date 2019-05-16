/**
 * Transforms a JavaScript array of strings into a Cassandra parenthesized list of strings.
 * 
 * @param {string[]} arr A JavaScript array of strings.
 */
function toPreparedList(arr) {
    var list = `(`;
    for (var elem of arr) {
        list += '?,';
    }
    list = list.substring(0,list.length - 1);
    list += `)`;
    return list;
}

module.exports = {
    toPreparedList: toPreparedList
}