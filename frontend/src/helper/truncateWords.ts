import React from 'react'

type truncateWords ={
    text: string;
    maxWords: number;
}

const truncateWords = ({text, maxWords}: truncateWords): string => {
        const words = text.split(' ');
        if (words.length <= maxWords) return text;
        return words.slice(0, maxWords).join(' ') + '...';
    };

export default truncateWords;