const keccak256 = require('js-sha3').keccak256;

auditSlice = function(slice, orderHashSet, order) {
        let tid = order.tid || '';
        let content = order.content || '';
        let mergeT = '';
        let leftChild = '';
        let rightChild = '';
        if(orderHashSet.indexOf(keccak256(content)) >= 0) {// order的hash存在於一堆肉粽中？
            console.log(tid+' order check ........ ok!');
            for( let i = 0 ; i < orderHashSet.length ; i++){
                mergeT = mergeT.concat(orderHashSet[i]);// 串肉粽
            }
                let Digest = keccak256(mergeT);// 算串肉粽hash
            if(Digest === slice[0] || Digest === slice[1]) { // 稽核切片
                while(slice.length > 1) {
                    leftChild = slice.shift();
                    rightChild = slice.shift();
                    if(!keccak256(leftChild.concat(rightChild)) === slice[0] && !keccak256(leftChild.concat(rightChild)) === slice[1]) {
                        return 'auditing have problem at : ' + leftChild + ' and ' + rightChild;
                    }
                }
                return tid+' slice audit ........ ok!';
            } else {
                return 'Leaf hash error, data incorrect.';
            }
        } else {
            return tid+' order check ........ order hash not in the leaf.';
        }
    }
