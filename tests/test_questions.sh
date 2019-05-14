jq -c '.[]' data/questions_proper.json | while read i; do
    title=$(echo $i | jq -r '.title')
    echo $title
done