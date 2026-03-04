package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
)

type Event struct {
	ProjectID string `json:"project_id"`
	EventType string `json:"event_type"`
	Timestamp int64  `json:"timestamp"`
	Path      string `json:"path"`
	Referrer  string `json:"referrer"`
	Screen    string `json:"screen"`
}

var db *dynamodb.DynamoDB
var tableName string

func init() {
	sess := session.Must(session.NewSession())
	db = dynamodb.New(sess)
	tableName = os.Getenv("TABLE_NAME")
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	headers := map[string]string{
		"Access-Control-Allow-Origin":  "*",
		"Access-Control-Allow-Methods": "POST,OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	}

	var evt Event
	if err := json.Unmarshal([]byte(request.Body), &evt); err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 400,
			Headers:    headers,
			Body:       `{"error":"Invalid request"}`,
		}, nil
	}

	date := time.Unix(evt.Timestamp/1000, 0).Format("2006-01-02")
	pk := fmt.Sprintf("%s#%s", evt.ProjectID, date)
	sk := fmt.Sprintf("%d", evt.Timestamp)

	_, err := db.PutItem(&dynamodb.PutItemInput{
		TableName: aws.String(tableName),
		Item: map[string]*dynamodb.AttributeValue{
			"pk":         {S: aws.String(pk)},
			"sk":         {S: aws.String(sk)},
			"event_type": {S: aws.String(evt.EventType)},
			"path":       {S: aws.String(evt.Path)},
			"referrer":   {S: aws.String(evt.Referrer)},
			"screen":     {S: aws.String(evt.Screen)},
		},
	})

	if err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    headers,
			Body:       `{"error":"Failed to store event"}`,
		}, nil
	}

	return events.APIGatewayProxyResponse{
		StatusCode: 204,
		Headers:    headers,
	}, nil
}

func main() {
	lambda.Start(handler)
}
